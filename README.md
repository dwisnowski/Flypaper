# Flypaper

OpenSky flight wall — a FastAPI + React app that shows airplanes near you **only when you choose to spend API credits**.

## Quick start

```bash
cp .env.example .env
# Edit .env with your OpenSky client id/secret (or keep credentials.json locally)

make install
make run
```

- API: http://127.0.0.1:8000  
- UI Map: http://127.0.0.1:5173/  
- UI Globe (WebGL): http://127.0.0.1:5173/globe  

Open the UI, allow location (or set `HOME_LAT` / `HOME_LON` / ZIP), then press **Scan sky**. Scans and flight paths are stored in `localStorage` (`flypaper.v1`) so both Map and Globe share the same spent-credit data across reloads.

## Pages

| Route | What |
|-------|------|
| `/` | Leaflet 2D flight wall (Phase 1) |
| `/globe` | React Three Fiber WebGL globe — planes, paths, particles, bump terrain, RainViewer radar (Phase 2, iPad Safari–friendly) |

Toggle the storm icon for **RainViewer** live radar (free personal/educational use — attribution shown on the UI).

## Makefile

| Target | What it does |
|--------|----------------|
| `make install` | `uv sync` + frontend `npm install` |
| `make run` | API + Vite together |
| `make run-api` / `make run-web` | Run one side |
| `make build` | Production frontend build (API serves `frontend/dist`) |
| `make health` | Hit `/api/health` |
| `make aircraft-db` | Download OpenSky aircraft metadata CSV for richer type/operator filters |
| `make lint` | Ruff + oxlint |
| `make clean` | Remove venv, node_modules, dist, cached DB |

## Configuration

All runtime knobs live in `.env` (see `.env.example`):

- `OPEN_SKY_CLIENT_ID` / `OPEN_SKY_CLIENT_SECRET` — from your OpenSky account API client
- `OPEN_SKY_CREDENTIALS_FILE` — optional path to `credentials.json`
- `HOME_LAT` / `HOME_LON` — fallback when browser geolocation is denied
- `DEFAULT_RADIUS_KM` — default scan radius (bbox sized to prefer the **1-credit** OpenSky tier)

**Never commit** `.env` or `credentials.json`.

## Credits

OpenSky `/states/all` costs **1–4 credits** depending on bounding-box area. The UI shows the estimated cost before you scan and displays `X-Rate-Limit-Remaining` after each spend. Page refresh uses the cached snapshot and does **not** call OpenSky.

## Filters

Client-side on the last snapshot:

- Usage: military / commercial / personal / unknown (heuristics + optional aircraft DB)
- Airframe: jet / turboprop / piston / heli / uav / other
- Altitude, distance from you, speed, climb state, airborne-only, callsign, country

## Optional enrichment

```bash
make aircraft-db
```

Loads typecode / operator / registration for better classification. Without it, filters still work from ADS-B category + callsign patterns.

## Phase 2 (WebGL)

`/globe` uses React Three Fiber + Three.js with iPad Safari defaults (capped DPR, no antialias, lower particle counts). Live weather is RainViewer via `/api/weather/radar-maps` (and optional tile proxy). Shared scan data lives in `localStorage` so Map and Globe stay in sync. Real DEM / NOAA WMS are future work.
