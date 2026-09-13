# Observer location

Choose where “you” are for scans: browser GPS, home fallback, ZIP/postal code, or a map pin.

## Overview

- **Geo** — browser geolocation when allowed.
- **Home** — `HOME_LAT` / `HOME_LON` from `.env` if geo fails.
- **ZIP** — US ZIP or Canadian postal code via `/api/geocode/zip`.
- **Map** — press and hold (~0.55s) on empty map area to drop a pin.

Pinned ZIP/map locations override live GPS until you change them. The toolbar location chip opens ZIP entry or refreshes GPS depending on source.

## Screenshot

![Map tip: Press and hold to set location](../images/scan-sky-hero.png)

The map overlay reads **Press & hold to set location**. Long-press ignores markers and map controls so you do not accidentally move while selecting a plane.
