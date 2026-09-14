# Flypaper docs

Feature documentation for the OpenSky credit-gated flight wall. Each page has a short overview and screenshots from the live UI.

## Features

| Feature | Summary |
|---------|---------|
| [Scan sky](features/scan-sky.md) | Spend OpenSky credits only when you press the button |
| [Credit gauge](features/credit-gauge.md) | See remaining daily credits and last-scan spend |
| [Leaflet map](features/leaflet-map.md) | 2D flight wall with planes, radius, and paths |
| [Observer location](features/observer-location.md) | GPS, ZIP/postal, or press-and-hold map pin |
| [Scan stats panel](features/scan-stats.md) | Interactive breakdowns after a scan |
| [Filters](features/filters.md) | Client-side filters that never spend credits |
| [Aircraft list](features/aircraft-list.md) | Scrollable list of the filtered snapshot |
| [Flight paths](features/flight-paths.md) | Flown track + estimated remaining path |
| [WebGL globe](features/webgl-globe.md) | 3D Earth view of the same snapshot |
| [RainViewer radar](features/rainviewer-radar.md) | Live precipitation overlay on map and globe |
| [LAN QR access](features/lan-qr-access.md) | Open the current page from a phone on Wi‑Fi |
| [Themes & sounds](features/themes-and-sounds.md) | Light/dark theme and scan feedback sounds |
| [Settings](features/settings.md) | Distance unit (mi/km) and other app preferences |
| [OpenSky credentials](features/opensky-credentials.md) | Browser localStorage + optional server `.env` fallback |
| [Shared browser store](features/shared-store.md) | Map and Globe share one `localStorage` snapshot |

## Deploy

| Guide | Summary |
|-------|---------|
| [Render (free)](deploy-render.md) | Docker web service: API + SPA from one process |

## Screenshots

All images live in [`images/`](images/).
