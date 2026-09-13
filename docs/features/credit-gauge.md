# Credit gauge

Track remaining OpenSky daily credits and what the last scan spent.

## Overview

- Shows remaining credits against the daily allowance (default `4000`).
- Animates when credits drop after a scan.
- Compact mode in the app bar after the first scan; full card on the pre-scan hero and Globe page.

## Screenshot

![Credits and Scan sky in the app bar after a scan](../images/map-flight-wall.png)

OpenSky returns remaining credits via rate-limit headers. Until the first spend, the UI may show credits as unknown.
