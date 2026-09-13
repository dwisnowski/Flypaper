# OpenSky credentials

Flypaper spends **your** OpenSky API credits. Credentials are resolved in this order:

1. **Browser** — client id + secret saved via the toolbar key icon (`localStorage` key `flypaper.opensky`), sent as `X-OpenSky-Client-Id` / `X-OpenSky-Client-Secret` on scan and flight-path requests only.
2. **Server `.env` / `credentials.json`** — used when the browser does not send headers (convenient for local `make run`).

`GET /api/config` exposes `server_opensky_configured` (boolean only — never the secret values) so the UI can tell you whether a server fallback exists.

On a shared host, leave server OpenSky env vars empty so each visitor must bring their own credentials.
