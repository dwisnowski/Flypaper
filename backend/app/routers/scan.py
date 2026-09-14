from __future__ import annotations

import logging
import re
import time

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.config import Settings, get_settings
from app.models import (
    ConfigPublic,
    CreditsResponse,
    DestinationInfo,
    FlightPathRequest,
    FlightPathResponse,
    HealthResponse,
    LatLonPoint,
    ScanRequest,
    ScanResponse,
    SnapshotResponse,
    estimate_credit_cost,
    parse_state_vector,
    radius_to_bbox,
)
from app.opensky.airports import guess_destination, interpolate_arc
from app.opensky.client import (
    CredentialsMissingError,
    OpenSkyClient,
    OpenSkyRateLimitError,
    get_remembered_credits,
    server_opensky_configured,
)
from app.store import enrich_planes, snapshot_store

logger = logging.getLogger(__name__)

router = APIRouter()


def _settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", None) or get_settings()


def _client(request: Request) -> OpenSkyClient:
    try:
        return OpenSkyClient.from_request(request, _settings(request))
    except CredentialsMissingError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def _enricher(request: Request):
    return request.app.state.enricher


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    from app import __version__

    settings = _settings(request)
    return HealthResponse(
        status="ok",
        version=__version__,
        home_lat=settings.home_lat,
        home_lon=settings.home_lon,
        default_radius_km=settings.default_radius_km,
    )


@router.get("/config", response_model=ConfigPublic)
def public_config(request: Request) -> ConfigPublic:
    settings = _settings(request)
    return ConfigPublic(
        home_lat=settings.home_lat,
        home_lon=settings.home_lon,
        default_radius_km=settings.default_radius_km,
        server_opensky_configured=server_opensky_configured(settings),
    )


@router.get("/credits", response_model=CreditsResponse)
def credits() -> CreditsResponse:
    remaining, fetched_at = get_remembered_credits()
    snap = snapshot_store.get()
    if remaining is None and snap is not None:
        remaining = snap.credits_remaining
        fetched_at = snap.fetched_at
    return CreditsResponse(credits_remaining=remaining, last_fetched_at=fetched_at)


@router.get("/snapshot", response_model=SnapshotResponse)
def snapshot() -> SnapshotResponse:
    snap = snapshot_store.get()
    if snap is None:
        raise HTTPException(status_code=404, detail="No snapshot yet — press Scan sky.")
    return SnapshotResponse(**snap.model_dump(), available=True)


@router.post("/scan", response_model=ScanResponse)
def scan(body: ScanRequest, request: Request) -> ScanResponse:
    bbox = radius_to_bbox(body.lat, body.lon, body.radius_km)
    cost = estimate_credit_cost(bbox)

    try:
        result = _client(request).get_states_in_bbox(
            lamin=bbox["lamin"],
            lamax=bbox["lamax"],
            lomin=bbox["lomin"],
            lomax=bbox["lomax"],
            extended=True,
        )
    except OpenSkyRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "message": str(exc),
                "retry_after_seconds": exc.retry_after_seconds,
                "credits_remaining": 0,
            },
        ) from exc
    except CredentialsMissingError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        logger.exception("OpenSky HTTP error")
        raise HTTPException(
            status_code=502,
            detail=f"OpenSky error: {exc.response.status_code}",
        ) from exc
    except httpx.TimeoutException as exc:
        logger.exception("OpenSky request timed out")
        raise HTTPException(
            status_code=502,
            detail=(
                "OpenSky timed out from this host. OpenSky often blocks AWS and other "
                "cloud egress IPs — local or non-hyperscaler hosting usually works."
            ),
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("OpenSky request failed")
        raise HTTPException(status_code=502, detail=f"OpenSky request failed: {exc}") from exc

    raw_planes = []
    for row in result.states:
        parsed = parse_state_vector(row)
        if parsed is None:
            continue
        if parsed.get("latitude") is None or parsed.get("longitude") is None:
            continue
        raw_planes.append(parsed)

    planes = enrich_planes(
        raw_planes,
        observer_lat=body.lat,
        observer_lon=body.lon,
        enricher=_enricher(request),
    )
    planes = [
        p for p in planes if p.distance_km is None or p.distance_km <= body.radius_km
    ]
    planes.sort(key=lambda p: p.distance_km if p.distance_km is not None else 1e9)

    response = ScanResponse(
        planes=planes,
        credits_remaining=result.credits_remaining,
        credits_spent_estimate=cost,
        fetched_at=time.time(),
        observer_lat=body.lat,
        observer_lon=body.lon,
        radius_km=body.radius_km,
        bbox=bbox,
        plane_count=len(planes),
    )
    snapshot_store.save(response)
    logger.info(
        "Scan complete: %s planes, ~%s credit(s), remaining=%s",
        response.plane_count,
        cost,
        result.credits_remaining,
    )
    return response


@router.get("/estimate")
def estimate_cost(
    lat: float,
    lon: float,
    request: Request,
    radius_km: float | None = None,
):
    settings = _settings(request)
    radius = radius_km if radius_km is not None else settings.default_radius_km
    bbox = radius_to_bbox(lat, lon, radius)
    return {
        "radius_km": radius,
        "bbox": bbox,
        "credits_spent_estimate": estimate_credit_cost(bbox),
    }


@router.get("/geocode/zip")
def geocode_zip(zip: str):
    """Resolve a US ZIP (or CA postal code) to lat/lon via Zippopotam.us."""
    raw = zip.strip().upper().replace(" ", "")
    if not raw:
        raise HTTPException(status_code=400, detail="ZIP code is required")

    # US 5-digit (optional +4)
    us_match = re.fullmatch(r"(\d{5})(?:-\d{4})?", raw)
    # Canadian postal: A1A1A1
    ca_match = re.fullmatch(r"([A-Z]\d[A-Z])\d[A-Z]\d", raw)

    if us_match:
        country, code = "us", us_match.group(1)
    elif ca_match:
        country, code = "ca", ca_match.group(1)
    elif re.fullmatch(r"[A-Z]\d[A-Z]", raw):
        country, code = "ca", raw
    else:
        raise HTTPException(
            status_code=400,
            detail="Enter a US ZIP (e.g. 94102) or Canadian postal code",
        )

    url = f"https://api.zippopotam.us/{country}/{code}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Geocoder unreachable: {exc}") from exc

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"ZIP/postal code not found: {zip}")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Geocoder error")

    data = response.json()
    places = data.get("places") or []
    if not places:
        raise HTTPException(status_code=404, detail=f"ZIP/postal code not found: {zip}")

    place = places[0]
    try:
        lat = float(place["latitude"])
        lon = float(place["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Invalid geocoder response") from exc

    label_parts = [
        place.get("place name"),
        place.get("state abbreviation") or place.get("state"),
        data.get("post code") or code,
    ]
    label = ", ".join(p for p in label_parts if p)

    return {
        "lat": lat,
        "lon": lon,
        "zip": data.get("post code") or code,
        "label": label,
        "country": data.get("country") or country.upper(),
    }


@router.post("/flight-path/{icao24}", response_model=FlightPathResponse)
def flight_path(icao24: str, body: FlightPathRequest, request: Request) -> FlightPathResponse:
    """
    Spend ~4 *tracks* credits for the live OpenSky trajectory (flown path),
    then estimate the remaining path toward a likely hub or along heading.

    OpenSky does not expose live IFR destinations; remaining path is estimated.
    """
    code = icao24.strip().lower()
    if not re.fullmatch(r"[0-9a-f]{6}", code):
        raise HTTPException(status_code=400, detail="icao24 must be a 6-char hex address")

    try:
        track = _client(request).get_track(code, time_secs=0)
    except OpenSkyRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "message": str(exc),
                "retry_after_seconds": exc.retry_after_seconds,
                "credits_remaining": 0,
                "bucket": "tracks",
            },
        ) from exc
    except CredentialsMissingError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        logger.exception("OpenSky track HTTP error")
        raise HTTPException(
            status_code=502,
            detail=f"OpenSky track error: {exc.response.status_code}",
        ) from exc
    except httpx.TimeoutException as exc:
        logger.exception("OpenSky track timed out")
        raise HTTPException(
            status_code=502,
            detail=(
                "OpenSky timed out from this host. OpenSky often blocks AWS and other "
                "cloud egress IPs — local or non-hyperscaler hosting usually works."
            ),
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("OpenSky track request failed")
        raise HTTPException(status_code=502, detail=f"OpenSky track failed: {exc}") from exc

    flown: list[LatLonPoint] = []
    callsign = None
    start_time = end_time = None
    track_credits = get_remembered_credits("tracks")[0]

    if track is not None:
        callsign = track.callsign
        start_time = track.start_time
        end_time = track.end_time
        track_credits = track.credits_remaining
        for wp in track.path:
            if not wp or len(wp) < 3:
                continue
            wlat, wlon = wp[1], wp[2]
            if wlat is None or wlon is None:
                continue
            flown.append(LatLonPoint(lat=float(wlat), lon=float(wlon)))

    # Prefer live snapshot kinematics; fall back to last track waypoint.
    cur_lat = body.lat
    cur_lon = body.lon
    cur_track = body.true_track
    if (cur_lat is None or cur_lon is None) and flown:
        cur_lat, cur_lon = flown[-1].lat, flown[-1].lon
    if cur_track is None and len(flown) >= 2:
        from app.opensky.airports import initial_bearing_deg

        cur_track = initial_bearing_deg(
            flown[-2].lat, flown[-2].lon, flown[-1].lat, flown[-1].lon
        )

    remaining: list[LatLonPoint] = []
    destination: DestinationInfo | None = None
    note = (
        "Flown path from OpenSky live track (~4 track credits). "
        "OpenSky does not publish live destinations — remaining path is estimated."
    )

    if cur_lat is not None and cur_lon is not None:
        guess = guess_destination(
            lat=cur_lat,
            lon=cur_lon,
            true_track=cur_track,
            speed_ms=body.velocity_ms,
            altitude_m=body.baro_altitude_m,
        )
        destination = DestinationInfo(
            lat=guess.lat,
            lon=guess.lon,
            kind=guess.kind,
            label=guess.label,
            icao=guess.icao,
            distance_km=guess.distance_km,
        )
        arc = interpolate_arc(cur_lat, cur_lon, guess.lat, guess.lon, steps=28)
        remaining = [LatLonPoint(lat=p.lat, lon=p.lon) for p in arc]
        if guess.kind == "airport":
            note += f" Likely destination guess: {guess.label}."
        else:
            note += " Dashed line follows current heading (no hub match)."
    elif not flown:
        raise HTTPException(
            status_code=404,
            detail="No live track or position available for this aircraft",
        )
    else:
        note += " Could not estimate remaining path without a current position/heading."

    # Ensure current position is the join between flown and remaining.
    if (
        flown
        and cur_lat is not None
        and cur_lon is not None
        and (abs(flown[-1].lat - cur_lat) > 1e-4 or abs(flown[-1].lon - cur_lon) > 1e-4)
    ):
        flown.append(LatLonPoint(lat=cur_lat, lon=cur_lon))

    return FlightPathResponse(
        icao24=code,
        callsign=callsign,
        flown=flown,
        remaining=remaining,
        destination=destination,
        track_credits_remaining=track_credits,
        track_credits_spent_estimate=4,
        note=note,
        start_time=start_time,
        end_time=end_time,
    )

