# Deploy on Render (free)

Flypaper runs as **one Docker web service**: FastAPI serves `/api/*` and the built Vite SPA from `frontend/dist`.

## 1. Push this repo to GitHub

Render deploys from a Git host. Push `main` (or this branch) to GitHub/GitLab.

## 2. Create the service

### Option A — Blueprint (recommended)

1. Open [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
2. Connect the Flypaper repository.
3. Render reads [`render.yaml`](../render.yaml) and creates a free **flypaper** web service.
4. When prompted, set:
   - `OPEN_SKY_CLIENT_ID`
   - `OPEN_SKY_CLIENT_SECRET`
5. Deploy. Health check: `GET /api/health`.

### Option B — Manual Docker web service

1. **New** → **Web Service** → connect the repo.
2. Runtime: **Docker** (Dockerfile at repo root).
3. Instance type: **Free**.
4. Health check path: `/api/health`.
5. Add the env vars below → **Create Web Service**.

## 3. Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `OPEN_SKY_CLIENT_ID` | Yes | From your OpenSky API client |
| `OPEN_SKY_CLIENT_SECRET` | Yes | Secret — never commit |
| `HOME_LAT` / `HOME_LON` | No | Fallback observer (defaults SF) |
| `DEFAULT_RADIUS_KM` | No | Default `150` |
| `CORS_ORIGINS` | No | Same-origin SPA does not need CORS; keep or add your `https://….onrender.com` URL if you split hosts later |
| `DOWNLOAD_AIRCRAFT_DB` | No | Keep `false` on free tier (CSV is large) |

Render injects `PORT`; the image listens on `0.0.0.0:$PORT`.

## 4. After deploy

- App URL: `https://<service-name>.onrender.com`
- Map: `/` · Globe: `/globe`
- Free instances **spin down after idle**; the first request after sleep can take ~30–60s.

Optional: after you know the public URL, set `CORS_ORIGINS` to include `https://<service-name>.onrender.com` (harmless with same-origin hosting).

## OpenSky from cloud hosts

`POST /api/scan` calls OpenSky **from the Render server** (not the browser). OpenSky
[may block AWS and other hyperscaler IPs](https://openskynetwork.github.io/opensky-api/rest.html)
due to abuse; Render egress often sits in those ranges.

Symptoms: browser shows **502** on `/api/scan`, response body like
`OpenSky request failed: timed out` (or the clearer timeout message from newer builds).
`/api/health` still returns 200. The same scan works on your laptop.

Workarounds:

- Run locally (`make run`) or on a VPS whose egress is not blocked.
- Put OpenSky credentials in Render env vars anyway (required when the host *can* reach OpenSky; browser-saved creds also work).
- Do not expect OpenSky to whitelist an “AI dashboard” on hyperscaler IPs.

## 5. Local Docker smoke test

```bash
docker build -t flypaper .
docker run --rm -p 8000:8000 \
  -e OPEN_SKY_CLIENT_ID=… \
  -e OPEN_SKY_CLIENT_SECRET=… \
  flypaper
curl -sf http://127.0.0.1:8000/api/health
```

Without Docker, production shape locally:

```bash
make install && make build
make run-prod
```
