from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(150.0, gt=1, le=2000)


class Plane(BaseModel):
    icao24: str
    callsign: str | None = None
    origin_country: str | None = None
    longitude: float | None = None
    latitude: float | None = None
    baro_altitude_m: float | None = None
    geo_altitude_m: float | None = None
    on_ground: bool = False
    velocity_ms: float | None = None
    true_track: float | None = None
    vertical_rate_ms: float | None = None
    squawk: str | None = None
    category: int | None = None
    category_label: str | None = None
    # Enrichment / derived
    distance_km: float | None = None
    altitude_ft: float | None = None
    speed_kts: float | None = None
    climb_state: str | None = None  # climbing | descending | level | unknown
    usage: str = "unknown"  # military | commercial | personal | unknown
    airframe: str = "other"  # jet | turboprop | piston | heli | uav | other
    typecode: str | None = None
    model: str | None = None
    operator: str | None = None
    registration: str | None = None


class ScanResponse(BaseModel):
    planes: list[Plane]
    credits_remaining: int | None = None
    credits_spent_estimate: int
    fetched_at: float
    observer_lat: float
    observer_lon: float
    radius_km: float
    bbox: dict[str, float]
    plane_count: int


class SnapshotResponse(ScanResponse):
    available: bool = True


class CreditsResponse(BaseModel):
    credits_remaining: int | None = None
    daily_allowance: int = 4000
    last_fetched_at: float | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    home_lat: float
    home_lon: float
    default_radius_km: float


class ConfigPublic(BaseModel):
    home_lat: float
    home_lon: float
    default_radius_km: float
    daily_allowance: int = 4000
    server_opensky_configured: bool = False


class LatLonPoint(BaseModel):
    lat: float
    lon: float


class FlightPathRequest(BaseModel):
    """Optional live kinematics from the current snapshot to refine the remaining path."""

    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)
    true_track: float | None = Field(None, ge=0, le=360)
    velocity_ms: float | None = Field(None, ge=0)
    baro_altitude_m: float | None = None


class DestinationInfo(BaseModel):
    lat: float
    lon: float
    kind: str
    label: str
    icao: str | None = None
    distance_km: float | None = None


class FlightPathResponse(BaseModel):
    icao24: str
    callsign: str | None = None
    flown: list[LatLonPoint]
    remaining: list[LatLonPoint]
    destination: DestinationInfo | None = None
    track_credits_remaining: int | None = None
    track_credits_spent_estimate: int = 4
    note: str
    start_time: int | None = None
    end_time: int | None = None


# ADS-B emitter categories (OpenSky extended field)
CATEGORY_LABELS: dict[int, str] = {
    0: "No information",
    1: "No ADS-B category info",
    2: "Light",
    3: "Small",
    4: "Large",
    5: "High vortex large",
    6: "Heavy",
    7: "High performance",
    8: "Rotorcraft",
    9: "Glider",
    10: "Lighter-than-air",
    11: "Parachutist",
    12: "Ultralight",
    13: "Reserved",
    14: "UAV",
    15: "Space vehicle",
    16: "Emergency vehicle",
    17: "Service vehicle",
    18: "Point obstacle",
    19: "Cluster obstacle",
    20: "Line obstacle",
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def radius_to_bbox(lat: float, lon: float, radius_km: float) -> dict[str, float]:
    """Approximate bounding box for a radius around a point."""
    # 1 deg lat ~ 111.32 km
    dlat = radius_km / 111.32
    cos_lat = max(math.cos(math.radians(lat)), 0.01)
    dlon = radius_km / (111.32 * cos_lat)
    return {
        "lamin": max(lat - dlat, -90.0),
        "lamax": min(lat + dlat, 90.0),
        "lomin": max(lon - dlon, -180.0),
        "lomax": min(lon + dlon, 180.0),
    }


def estimate_credit_cost(bbox: dict[str, float]) -> int:
    """OpenSky credit cost by bounding-box area in square degrees."""
    area = (bbox["lamax"] - bbox["lamin"]) * (bbox["lomax"] - bbox["lomin"])
    if area <= 25:
        return 1
    if area <= 100:
        return 2
    if area <= 400:
        return 3
    return 4


def parse_state_vector(row: list[Any]) -> dict[str, Any] | None:
    if not row or len(row) < 17:
        return None
    icao24 = row[0]
    if not icao24:
        return None
    category = row[17] if len(row) > 17 else None
    return {
        "icao24": str(icao24).lower(),
        "callsign": (row[1] or "").strip() or None,
        "origin_country": row[2],
        "longitude": row[5],
        "latitude": row[6],
        "baro_altitude_m": row[7],
        "on_ground": bool(row[8]) if row[8] is not None else False,
        "velocity_ms": row[9],
        "true_track": row[10],
        "vertical_rate_ms": row[11],
        "geo_altitude_m": row[13],
        "squawk": row[14],
        "category": category,
        "category_label": CATEGORY_LABELS.get(category) if category is not None else None,
    }
