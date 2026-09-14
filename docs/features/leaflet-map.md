# Leaflet map

The Phase 1 flight wall at `/` — a dark Leaflet map of aircraft near you.

## Overview

- Aircraft markers with heading, scan-radius circle, and observer pin.
- Marker popup shows callsign, model/type, altitude, and distance, plus an info button for the full aircraft details popover.
- Optional flight paths when a plane is selected.
- Press-and-hold empty map to move the observer (see [Observer location](observer-location.md)).
- Shares the same snapshot as the Globe via `localStorage`.

## Screenshot

![Map flight wall with stats, map, and aircraft list](../images/map-flight-wall.png)

Basemap tiles are CARTO/OSM dark style. Zoom, pan, and the radius slider (mi/km via [Settings](settings.md)) control how you inspect the last scan (filters never re-spend credits).
