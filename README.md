# Flypaper

OpenSky flight wall — a FastAPI + React app that shows airplanes near you **only when you choose to spend API credits**.

## Quick start

```bash
cp .env.example .env
# Optional for local use: put your OpenSky client id/secret in .env
# (hosted users enter credentials in the app instead — see below)

make install
make run
```

- API: http://127.0.0.1:8000  
- UI Map: http://127.0.0.1:5173/  
- UI Globe (WebGL): http://127.0.0.1:5173/globe  

Open the UI, allow location (or set `HOME_LAT` / `HOME_LON` / ZIP), then press **Scan sky**. Scans and flight paths are stored in `localStorage` (`flypaper.v1`) so both Map and Globe share the same spent-credit data across reloads.

### OpenSky credentials

- **Hosted / shared deploy:** use the **key** icon in the toolbar to paste your OpenSky client id and secret. They are stored only in **this browser’s** `localStorage` (`flypaper.opensky`) and sent to the Flypaper API when you scan or load a flight path — not shared with other visitors.
- **Local `.env`:** still supported. If `OPEN_SKY_CLIENT_ID` / `OPEN_SKY_CLIENT_SECRET` (or `credentials.json`) are set on the server, scans work without saving credentials in the browser. Prefer `.env` for solo local development so you never paste secrets into a shared site.

## Features

| Feature | What it does |
|---------|----------------|
| [Scan sky](docs/features/scan-sky.md) | Explicit OpenSky pulls — spend credits only on demand |
| [Credit gauge](docs/features/credit-gauge.md) | Remaining daily credits and last-scan spend |
| [Leaflet map](docs/features/leaflet-map.md) | 2D flight wall with planes, radius, and paths |
| [Observer location](docs/features/observer-location.md) | GPS, ZIP/postal, or press-and-hold map pin |
| [Scan stats](docs/features/scan-stats.md) | Interactive airframe / usage / climb / speed / altitude panel |
| [Filters](docs/features/filters.md) | Client-side filters that never spend credits |
| [Aircraft list](docs/features/aircraft-list.md) | Callsign list synced to map and globe selection |
| [Flight paths](docs/features/flight-paths.md) | Flown track + estimated remaining path |
| [WebGL globe](docs/features/webgl-globe.md) | 3D Earth view of the same snapshot |
| [RainViewer radar](docs/features/rainviewer-radar.md) | Live precipitation on map and globe |
| [LAN QR access](docs/features/lan-qr-access.md) | Open the current page from a phone on Wi‑Fi |
| [Themes & sounds](docs/features/themes-and-sounds.md) | Light/dark theme and action sounds |
| [Shared browser store](docs/features/shared-store.md) | One `localStorage` snapshot for Map + Globe |

Full write-ups with screenshots: **[docs/](docs/README.md)**.

![Map flight wall after a scan](docs/images/map-flight-wall.png)

## Pages

| Route | What |
|-------|------|
| `/` | Leaflet 2D flight wall (Phase 1) + scan stats |
| `/globe` | React Three Fiber WebGL globe — planes, paths, particles, RainViewer radar (Phase 2, iPad Safari–friendly) |

Toggle the storm icon for **RainViewer** live radar (free personal/educational use — attribution shown on the UI).

## Makefile

| Target | What it does |
|--------|----------------|
| `make install` | `uv sync` + frontend `npm install` |
| `make run` | API + Vite together |
| `make run-api` / `make run-web` | Run one side |
| `make build` | Production frontend build (API serves `frontend/dist`) |
| `make run-prod` | Single process like production (needs `make build` first) |
| `make health` | Hit `/api/health` |
| `make aircraft-db` | Download OpenSky aircraft metadata CSV for richer type/operator filters |
| `make lint` | Ruff + oxlint |
| `make clean` | Remove venv, node_modules, dist, cached DB |

## Deploy on Render (free)

One Docker web service serves the API and the built SPA. See **[docs/deploy-render.md](docs/deploy-render.md)**.

Short version:

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select the repo (`render.yaml`).
3. Set `OPEN_SKY_CLIENT_ID` and `OPEN_SKY_CLIENT_SECRET`.
4. Open `https://<service>.onrender.com` (free tier sleeps when idle).

## Configuration

All runtime knobs live in `.env` (see `.env.example`):

- `OPEN_SKY_CLIENT_ID` / `OPEN_SKY_CLIENT_SECRET` — optional local/dev fallback (hosted users use the in-app key icon)
- `OPEN_SKY_CREDENTIALS_FILE` — optional path to `credentials.json` (same fallback)
- `HOME_LAT` / `HOME_LON` — fallback when browser geolocation is denied
- `DEFAULT_RADIUS_KM` — default scan radius (bbox sized to prefer the **1-credit** OpenSky tier)
- On Render, set the OpenSky secrets in the dashboard; `PORT` is provided by the platform

**Never commit** `.env` or `credentials.json`.

## Credits

OpenSky `/states/all` costs **1–4 credits** depending on bounding-box area. The UI shows the estimated cost before you scan and displays remaining credits after each spend. Page refresh uses the cached snapshot and does **not** call OpenSky. Flight paths use a separate OpenSky **track** credit bucket (~4 per path).

## Optional enrichment

```bash
make aircraft-db
```

Loads typecode / operator / registration for better classification. Without it, filters still work from ADS-B category + callsign patterns.

## Phase 2 (WebGL)

`/globe` uses React Three Fiber + Three.js with iPad Safari defaults (capped DPR, no antialias, lower particle counts). Live weather is RainViewer via `/api/weather/radar-maps` (and optional tile proxy). Shared scan data lives in `localStorage` so Map and Globe stay in sync. Real DEM / NOAA WMS are future work.
