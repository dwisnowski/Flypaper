"""Destination heuristics: project heading and optionally snap to a nearby hub."""

from __future__ import annotations

import math
from dataclasses import dataclass

# Compact major hubs for "likely destination" guesses (lat, lon, icao, name).
MAJOR_AIRPORTS: list[tuple[float, float, str, str]] = [
    (33.9425, -118.4081, "KLAX", "Los Angeles"),
    (37.6213, -122.3790, "KSFO", "San Francisco"),
    (37.3639, -121.9289, "KSJC", "San Jose"),
    (37.7126, -122.2197, "KOAK", "Oakland"),
    (33.8297, -116.5067, "KPSP", "Palm Springs"),
    (36.0801, -115.1522, "KLAS", "Las Vegas"),
    (33.4342, -112.0116, "KPHX", "Phoenix"),
    (32.7336, -117.1897, "KSAN", "San Diego"),
    (47.4502, -122.3088, "KSEA", "Seattle"),
    (45.5898, -122.5951, "KPDX", "Portland"),
    (39.8561, -104.6737, "KDEN", "Denver"),
    (32.8998, -97.0403, "KDFW", "Dallas/Fort Worth"),
    (29.9902, -95.3368, "KIAH", "Houston"),
    (33.6407, -84.4277, "KATL", "Atlanta"),
    (41.9742, -87.9073, "KORD", "Chicago O'Hare"),
    (40.6413, -73.7781, "KJFK", "New York JFK"),
    (40.7769, -73.8740, "KLGA", "New York LaGuardia"),
    (40.6895, -74.1745, "KEWR", "Newark"),
    (42.3656, -71.0096, "KBOS", "Boston"),
    (38.9531, -77.4565, "KIAD", "Washington Dulles"),
    (38.8512, -77.0402, "KDCA", "Washington Reagan"),
    (25.7959, -80.2870, "KMIA", "Miami"),
    (28.4312, -81.3081, "KMCO", "Orlando"),
    (26.0726, -80.1527, "KFLL", "Fort Lauderdale"),
    (36.1263, -86.6782, "KBNA", "Nashville"),
    (35.2140, -80.9431, "KCLT", "Charlotte"),
    (39.8721, -75.2411, "KPHL", "Philadelphia"),
    (44.8820, -93.2218, "KMSP", "Minneapolis"),
    (42.2162, -83.3554, "KDTW", "Detroit"),
    (39.2976, -94.7139, "KMCI", "Kansas City"),
    (38.7487, -90.3700, "KSTL", "St. Louis"),
    (30.1945, -97.6699, "KAUS", "Austin"),
    (29.5337, -98.4698, "KSAT", "San Antonio"),
    (35.0402, -106.6090, "KABQ", "Albuquerque"),
    (40.7884, -111.9778, "KSLC", "Salt Lake City"),
    (61.1743, -149.9982, "PANC", "Anchorage"),
    (21.3245, -157.9251, "PHNL", "Honolulu"),
    (51.4700, -0.4543, "EGLL", "London Heathrow"),
    (51.1537, -0.1821, "EGKK", "London Gatwick"),
    (53.3537, -2.2749, "EGCC", "Manchester"),
    (49.0097, 2.5479, "LFPG", "Paris CDG"),
    (48.3538, 11.7861, "EDDM", "Munich"),
    (50.0379, 8.5622, "EDDF", "Frankfurt"),
    (52.3105, 4.7683, "EHAM", "Amsterdam"),
    (41.2971, 2.0785, "LEBL", "Barcelona"),
    (40.4983, -3.5676, "LEMD", "Madrid"),
    (45.6306, 8.7281, "LIMC", "Milan Malpensa"),
    (41.8003, 12.2389, "LIRF", "Rome Fiumicino"),
    (47.4647, 8.5492, "LSZH", "Zurich"),
    (48.1103, 16.5697, "LOWW", "Vienna"),
    (55.6180, 12.6560, "EKCH", "Copenhagen"),
    (59.6519, 17.9186, "ESSA", "Stockholm"),
    (60.3172, 24.9633, "EFHK", "Helsinki"),
    (53.4213, -6.2701, "EIDW", "Dublin"),
    (38.7742, -9.1342, "LPPT", "Lisbon"),
    (37.9364, 23.9445, "LGAV", "Athens"),
    (40.9769, 28.8146, "LTFM", "Istanbul"),
    (25.2532, 55.3657, "OMDB", "Dubai"),
    (24.4330, 54.6511, "OMAA", "Abu Dhabi"),
    (25.2731, 51.6081, "OTHH", "Doha"),
    (21.6796, 39.1565, "OEJN", "Jeddah"),
    (24.9576, 46.6988, "OERK", "Riyadh"),
    (1.3644, 103.9915, "WSSS", "Singapore"),
    (13.6900, 100.7501, "VTBS", "Bangkok"),
    (22.3080, 113.9185, "VHHH", "Hong Kong"),
    (25.0797, 121.2342, "RCTP", "Taipei"),
    (35.5494, 139.7798, "RJTT", "Tokyo Haneda"),
    (35.7647, 140.3864, "RJAA", "Tokyo Narita"),
    (34.4273, 135.2440, "RJBB", "Osaka Kansai"),
    (37.4602, 126.4407, "RKSI", "Seoul Incheon"),
    (31.1443, 121.8083, "ZSPD", "Shanghai Pudong"),
    (40.0799, 116.6031, "ZBAA", "Beijing Capital"),
    (23.3924, 113.2988, "ZGGG", "Guangzhou"),
    (22.6393, 113.8107, "ZGSZ", "Shenzhen"),
    (-33.9461, 151.1772, "YSSY", "Sydney"),
    (-37.6690, 144.8410, "YMML", "Melbourne"),
    (-27.3842, 153.1175, "YBBN", "Brisbane"),
    (-36.8485, 174.7633, "NZAA", "Auckland"),
    (-23.4356, -46.4731, "SBGR", "São Paulo Guarulhos"),
    (-22.8099, -43.2505, "SBGL", "Rio de Janeiro"),
    (-34.8222, -58.5358, "SAEZ", "Buenos Aires"),
    (19.4361, -99.0719, "MMMX", "Mexico City"),
    (43.6777, -79.6248, "CYYZ", "Toronto"),
    (45.4706, -73.7408, "CYUL", "Montreal"),
    (49.1947, -123.1792, "CYVR", "Vancouver"),
    (51.1215, -114.0076, "CYYC", "Calgary"),
]


@dataclass
class LatLon:
    lat: float
    lon: float


@dataclass
class DestinationGuess:
    lat: float
    lon: float
    kind: str  # airport | heading
    label: str
    icao: str | None = None
    distance_km: float | None = None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlmb = math.radians(lon2 - lon1)
    x = math.sin(dlmb) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dlmb)
    return (math.degrees(math.atan2(x, y)) + 360.0) % 360.0


def destination_point(lat: float, lon: float, bearing_deg: float, distance_km: float) -> LatLon:
    r = 6371.0
    brng = math.radians(bearing_deg)
    p1 = math.radians(lat)
    l1 = math.radians(lon)
    ang = distance_km / r
    p2 = math.asin(math.sin(p1) * math.cos(ang) + math.cos(p1) * math.sin(ang) * math.cos(brng))
    l2 = l1 + math.atan2(
        math.sin(brng) * math.sin(ang) * math.cos(p1),
        math.cos(ang) - math.sin(p1) * math.sin(p2),
    )
    return LatLon(lat=math.degrees(p2), lon=(math.degrees(l2) + 540.0) % 360.0 - 180.0)


def angle_delta_deg(a: float, b: float) -> float:
    return abs((a - b + 180.0) % 360.0 - 180.0)


def projected_distance_km(
    *,
    speed_ms: float | None,
    altitude_m: float | None,
) -> float:
    """How far to draw the remaining/projected segment."""
    if speed_ms and speed_ms > 5:
        # ~45 minutes of flight at current ground speed
        hours = 0.75
        dist = speed_ms * 3.6 * hours
        return max(40.0, min(dist, 2500.0))
    if altitude_m is not None:
        if altitude_m > 9000:
            return 800.0
        if altitude_m > 3000:
            return 250.0
        return 80.0
    return 150.0


def guess_destination(
    *,
    lat: float,
    lon: float,
    true_track: float | None,
    speed_ms: float | None = None,
    altitude_m: float | None = None,
) -> DestinationGuess:
    distance = projected_distance_km(speed_ms=speed_ms, altitude_m=altitude_m)
    bearing = true_track if true_track is not None else 0.0

    best: DestinationGuess | None = None
    best_score = float("inf")

    if true_track is not None:
        for alat, alon, icao, name in MAJOR_AIRPORTS:
            dist = haversine_km(lat, lon, alat, alon)
            if dist < 25 or dist > distance * 1.6:
                continue
            bearing_to = initial_bearing_deg(lat, lon, alat, alon)
            delta = angle_delta_deg(true_track, bearing_to)
            if delta > 35:
                continue
            # Prefer airports aligned with heading and within projected range.
            score = delta + abs(dist - distance) * 0.02
            if score < best_score:
                best_score = score
                best = DestinationGuess(
                    lat=alat,
                    lon=alon,
                    kind="airport",
                    label=f"{name} ({icao})",
                    icao=icao,
                    distance_km=round(dist, 1),
                )

    if best is not None:
        return best

    point = destination_point(lat, lon, bearing, distance)
    return DestinationGuess(
        lat=point.lat,
        lon=point.lon,
        kind="heading",
        label=f"Projected heading {bearing:.0f}° · ~{distance:.0f} km",
        distance_km=round(distance, 1),
    )


def interpolate_arc(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    *,
    steps: int = 24,
) -> list[LatLon]:
    """Great-circle points from A to B (inclusive)."""
    if steps < 2:
        return [LatLon(lat1, lon1), LatLon(lat2, lon2)]
    points: list[LatLon] = []
    total = haversine_km(lat1, lon1, lat2, lon2)
    if total < 0.5:
        return [LatLon(lat1, lon1), LatLon(lat2, lon2)]
    bearing = initial_bearing_deg(lat1, lon1, lat2, lon2)
    for i in range(steps + 1):
        d = total * (i / steps)
        points.append(destination_point(lat1, lon1, bearing, d))
    return points
