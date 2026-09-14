"""In-memory snapshot of the last successful scan."""

from __future__ import annotations

import threading
import time
from typing import Any

from app.models import Plane, ScanResponse


class SnapshotStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._snapshot: ScanResponse | None = None

    def save(self, snapshot: ScanResponse) -> None:
        with self._lock:
            self._snapshot = snapshot

    def get(self) -> ScanResponse | None:
        with self._lock:
            return self._snapshot

    def as_dict(self) -> dict[str, Any] | None:
        snap = self.get()
        return snap.model_dump() if snap else None


snapshot_store = SnapshotStore()


def build_empty_scan(
    *,
    lat: float,
    lon: float,
    radius_km: float,
    bbox: dict[str, float],
    credits_spent_estimate: int,
    credits_remaining: int | None = None,
) -> ScanResponse:
    return ScanResponse(
        planes=[],
        credits_remaining=credits_remaining,
        credits_spent_estimate=credits_spent_estimate,
        fetched_at=time.time(),
        observer_lat=lat,
        observer_lon=lon,
        radius_km=radius_km,
        bbox=bbox,
        plane_count=0,
    )


def enrich_planes(
    raw_planes: list[dict[str, Any]],
    *,
    observer_lat: float,
    observer_lon: float,
    enricher: Any,
) -> list[Plane]:
    from app.models import haversine_km
    from app.opensky.enrich import (
        classify_airframe,
        classify_usage,
        climb_state_from_rate,
    )

    planes: list[Plane] = []
    for raw in raw_planes:
        lat = raw.get("latitude")
        lon = raw.get("longitude")
        distance = None
        if lat is not None and lon is not None:
            distance = round(haversine_km(observer_lat, observer_lon, lat, lon), 2)

        meta = enricher.lookup(raw["icao24"]) if enricher else None
        typecode = meta.typecode if meta else None
        model = meta.model if meta else None
        manufacturer = meta.manufacturer if meta else None
        operator = meta.operator if meta else None
        registration = meta.registration if meta else None
        owner = meta.owner if meta else None

        baro_m = raw.get("baro_altitude_m")
        velocity = raw.get("velocity_ms")
        vrate = raw.get("vertical_rate_ms")
        category = raw.get("category")

        usage = classify_usage(
            callsign=raw.get("callsign"),
            operator=operator,
            owner=owner,
            registration=registration,
            category=category,
        )
        airframe = classify_airframe(
            category=category,
            typecode=typecode,
            model=model,
            usage=usage,
        )

        planes.append(
            Plane(
                **raw,
                distance_km=distance,
                altitude_ft=round(baro_m * 3.28084, 0) if baro_m is not None else None,
                speed_kts=round(velocity * 1.94384, 1) if velocity is not None else None,
                climb_state=climb_state_from_rate(vrate),
                usage=usage,
                airframe=airframe,
                typecode=typecode,
                model=model,
                manufacturer=manufacturer,
                operator=operator,
                owner=owner,
                registration=registration,
            )
        )
    return planes
