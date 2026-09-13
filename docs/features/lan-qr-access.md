# LAN QR access

Open the current Flypaper route on a phone or iPad on the same Wi‑Fi.

## Overview

- QR button in the app bar builds LAN URLs via `/api/network/access`.
- Vite runs with `host: true` so devices on your network can reach `:5173`.
- Same path is preserved (`/` or `/globe`).

## Screenshot

![App bar with QR control next to credits and Scan sky](../images/map-flight-wall.png)

Requires the API and Vite processes to be reachable on your LAN IP, not only `127.0.0.1`.
