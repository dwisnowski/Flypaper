"""Aircraft metadata cache and classification heuristics."""

from __future__ import annotations

import csv
import logging
import re
from dataclasses import dataclass
from pathlib import Path

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

# Common military / government callsign prefixes and patterns.
_MILITARY_CALLSIGN_RE = re.compile(
    r"^(RCH|REACH|EVAC|DUKE|NAVY|MARINE|GUARD|ANG|AFRC|CNV|SPAR|"
    r"BOXER|VIPER|HAWK|EAGLE|FORCE|ARMY|COAST|CG\d|ASCOT|RRR|"
    r"NATO|OTAN|MMF|QID|QATARI|GAF|IAF|BAF|CAF|RAAF|RNZAF|"
    r"HAF|LAF|POLE|SNAKE|HORNET|TOMCAT|RAID|SLAM)",
    re.IGNORECASE,
)

# Airline-ish callsigns: 3-letter ICAO airline designator + flight number.
_COMMERCIAL_CALLSIGN_RE = re.compile(r"^[A-Z]{3}\d{1,4}[A-Z]?$", re.IGNORECASE)

# US N-numbers and similar light GA registrations often appear as callsigns.
_PERSONAL_CALLSIGN_RE = re.compile(
    r"^(N\d{1,5}[A-Z]{0,2}|G-[A-Z]{4}|C-[A-Z]{4}|VH-[A-Z]{3})$",
    re.IGNORECASE,
)

# Typecode → engine/airframe family (approximate, not exhaustive).
_JET_PREFIXES = (
    "A31", "A32", "A33", "A34", "A35", "A38", "B70", "B71", "B72", "B73", "B74",
    "B75", "B76", "B77", "B78", "E17", "E19", "E75", "CRJ", "ERJ", "E55", "E35",
    "MD8", "MD9", "BCS", "C17", "C5", "KC1", "F16", "F15", "F18", "F22", "F35",
    "B52", "B1", "B2", "C130",  # C130 is turboprop — handled below
    "GLF", "GLEX", "CL60", "C56X", "C68A", "C700", "C750", "FA50", "FA7X",
    "GALX", "HA4T", "LJ", "H25", "C25", "C50", "C55", "C56", "C68", "C70",
)

_TURBOPROP_CODES = {
    "C130", "C30J", "AT43", "AT45", "AT46", "AT72", "AT75", "AT76",
    "DH8A", "DH8B", "DH8C", "DH8D", "DHC6", "DHC7", "DHC8",
    "SF34", "SF3X", "B190", "BE20", "BE30", "BE35", "BE9L", "B350",
    "PC12", "PC24", "TBM7", "TBM8", "TBM9", "P46T", "PAY3", "PAY4",
    "AC90", "AC95", "JS31", "JS32", "JS41", "SW4", "C208", "C208B",
    "E120", "E110", "F27", "F50", "AN26", "AN32", "AN12", "Y12",
}

_HELI_CODES = {
    "H60", "S65", "S61", "S76", "S92", "B06", "B407", "B412", "B429", "B430",
    "EC35", "EC45", "EC55", "EC75", "AS50", "AS65", "A109", "A119", "A139",
    "A169", "R22", "R44", "R66", "UH1", "CH47", "AH64", "MD50", "MD60",
    "H500", "H269", "S300", "EC130", "H130", "H135", "H145", "H155", "H175",
    "H225", "AW109", "AW139", "AW169", "AW189", "MI8", "MI17", "MI24",
}

_UAV_CODES = {"MQ9", "MQ1", "RQ4", "RQ7", "RQ11", "GLOBALHAWK", "PREDATOR", "REAPER"}


@dataclass(frozen=True)
class AircraftMeta:
    icao24: str
    registration: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    typecode: str | None = None
    operator: str | None = None
    owner: str | None = None
    category_description: str | None = None


class AircraftEnricher:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._by_icao: dict[str, AircraftMeta] = {}
        self._loaded = False
        self._loading = False

    def start_background_load(self) -> None:
        """Kick off DB download/parse without blocking the API."""
        if self._loaded or self._loading:
            return
        import threading

        self._loading = True

        def _run() -> None:
            try:
                self.ensure_loaded()
            finally:
                self._loading = False

        threading.Thread(target=_run, name="aircraft-db-load", daemon=True).start()

    def ensure_loaded(self) -> None:
        if self._loaded:
            return
        path = self._settings.aircraft_db_file
        if not path.exists() or path.stat().st_size == 0:
            if self._settings.download_aircraft_db:
                self._download_db(path)
            else:
                logger.info(
                    "Aircraft DB not present at %s — using callsign/category heuristics only. "
                    "Run `make aircraft-db` to download enrichment data.",
                    path,
                )
                self._loaded = True
                return
        self._load_csv(path)
        self._loaded = True

    def _download_db(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        url = self._settings.aircraft_db_url
        logger.info("Downloading aircraft database from %s", url)
        try:
            with httpx.stream("GET", url, timeout=120.0, follow_redirects=True) as response:
                response.raise_for_status()
                with path.open("wb") as fh:
                    for chunk in response.iter_bytes():
                        fh.write(chunk)
            logger.info("Aircraft database saved to %s", path)
        except OSError as exc:
            logger.warning("Aircraft DB download failed (%s); continuing without it", exc)
            path.write_text("", encoding="utf-8")
        except httpx.HTTPError as exc:
            logger.warning("Aircraft DB download failed (%s); continuing without it", exc)
            path.write_text("", encoding="utf-8")

    def _load_csv(self, path: Path) -> None:
        if not path.exists() or path.stat().st_size == 0:
            logger.warning("Aircraft database empty or missing at %s", path)
            return

        # OpenSky CSV columns (subset): icao24, registration, manufacturericao,
        # manufacturername, model, typecode, serialnumber, linenumber, icaoaircrafttype,
        # operator, operatorcallsign, operatoricao, operatoriata, owner, ...
        try:
            with path.open("r", encoding="utf-8", errors="replace", newline="") as fh:
                reader = csv.DictReader(fh)
                count = 0
                for row in reader:
                    icao = (row.get("icao24") or "").strip().lower()
                    if not icao:
                        continue
                    self._by_icao[icao] = AircraftMeta(
                        icao24=icao,
                        registration=(row.get("registration") or "").strip() or None,
                        manufacturer=(row.get("manufacturername") or "").strip() or None,
                        model=(row.get("model") or "").strip() or None,
                        typecode=(row.get("typecode") or "").strip().upper() or None,
                        operator=(row.get("operator") or "").strip() or None,
                        owner=(row.get("owner") or "").strip() or None,
                        category_description=(row.get("categoryDescription") or "").strip()
                        or None,
                    )
                    count += 1
            logger.info("Loaded %s aircraft metadata records", count)
        except (OSError, csv.Error, UnicodeError) as exc:
            logger.warning("Failed to parse aircraft DB: %s", exc)

    def lookup(self, icao24: str) -> AircraftMeta | None:
        # Never block a scan on a multi-hundred-MB download — use heuristics until ready.
        if not self._loaded:
            return None
        return self._by_icao.get(icao24.lower())


def classify_airframe(
    *,
    category: int | None,
    typecode: str | None,
    model: str | None = None,
    usage: str | None = None,
) -> str:
    """Return jet | turboprop | piston | heli | uav | other."""
    if category == 8:
        return "heli"
    if category == 14:
        return "uav"
    if category in {9, 10, 11, 12}:
        return "other"

    code = (typecode or "").upper().replace("-", "").replace(" ", "")
    if not code and model:
        code = model.upper().replace("-", "").replace(" ", "")[:6]

    if code in _UAV_CODES or any(code.startswith(u) for u in _UAV_CODES):
        return "uav"
    if code in _HELI_CODES or any(code.startswith(h) for h in _HELI_CODES if len(h) >= 3):
        return "heli"
    if code in _TURBOPROP_CODES or any(code.startswith(t) for t in _TURBOPROP_CODES):
        return "turboprop"

    # Piston GA codes — check specific full-ish codes before jet prefixes.
    for p in (
        "C152",
        "C172",
        "C182",
        "C206",
        "C210",
        "PA28",
        "PA32",
        "SR20",
        "SR22",
        "DA40",
        "DA42",
        "M20",
        "BE33",
        "BE35",
        "BE36",
        "BE58",
        "P28A",
        "P28B",
    ):
        if code.startswith(p):
            return "piston"

    if any(code.startswith(j) for j in _JET_PREFIXES if j != "C130"):
        if code.startswith("C130") or code.startswith("C30J"):
            return "turboprop"
        return "jet"

    # ADS-B size hints when type unknown
    if category in {4, 5, 6, 7}:
        return "jet"
    if category in {2, 3}:
        return "piston"

    # Airline traffic without type metadata is almost always jet.
    if usage == "commercial":
        return "jet"

    return "other"


def classify_usage(
    *,
    callsign: str | None,
    operator: str | None,
    owner: str | None,
    registration: str | None,
    category: int | None,
) -> str:
    """Return military | commercial | personal | unknown."""
    cs = (callsign or "").strip().upper()
    blob = " ".join(filter(None, [operator, owner, cs])).upper()

    if _MILITARY_CALLSIGN_RE.search(cs) or any(
        kw in blob
        for kw in (
            "AIR FORCE", "AIRFORCE", "NAVY", "ARMY", "MARINE", "COAST GUARD",
            "MILITARY", "MINISTRY OF DEFENCE", "DEPARTMENT OF DEFENSE",
            "ROYAL AIR", "LUFTWAFFE", "AERONAUTICA",
        )
    ):
        return "military"

    if category == 7 and cs and _MILITARY_CALLSIGN_RE.search(cs):
        return "military"

    if cs and _COMMERCIAL_CALLSIGN_RE.match(cs):
        return "commercial"

    if operator and any(
        kw in operator.upper()
        for kw in ("AIRLINES", "AIRWAYS", "AIR LINE", "CARGO", "EXPRESS", "JETBLUE", "RYANAIR")
    ):
        return "commercial"

    if cs and _PERSONAL_CALLSIGN_RE.match(cs):
        return "personal"
    if registration and _PERSONAL_CALLSIGN_RE.match(registration.strip()):
        # Light aircraft often fly with registration as callsign — personal/GA bias
        if not operator or "AIR" not in operator.upper():
            return "personal"

    if category in {2, 3, 12}:
        return "personal"

    return "unknown"


def climb_state_from_rate(vertical_rate_ms: float | None) -> str:
    if vertical_rate_ms is None:
        return "unknown"
    if vertical_rate_ms > 1.0:
        return "climbing"
    if vertical_rate_ms < -1.0:
        return "descending"
    return "level"
