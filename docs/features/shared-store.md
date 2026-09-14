# Shared browser store

Map and Globe share one client-side store so a single scan powers both views.

## Overview

- Key: `flypaper.v1` in `localStorage`.
- Holds snapshot, path cache, filters, theme, mute, location, radius, distance unit, selection, and radar flag.
- Cross-tab `storage` events keep multiple windows aligned.
- Server also keeps an in-memory snapshot for API helpers; durable UX state is the browser store.

## Screenshot

![Map and Globe both driven by the same scanned snapshot](../images/map-flight-wall.png)

Data is per browser profile — not synced to a Flypaper account.
