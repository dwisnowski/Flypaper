# Scan stats panel

After the first scan on the Map page, the hero copy is replaced by an interactive stats dashboard.

## Overview

- Last scan time and age (turns red after 10 minutes).
- Aircraft count (`filtered / total` when filters are active).
- Pie charts: airframe and usage — click a slice to filter; click the center to clear that chart’s filter.
- Speed and altitude: min / mean / avg / max — click to select the matching (or nearest) aircraft.
- Climb-state bars — click to filter by climbing / level / descending / unknown.
- **Reset** clears all filters and the current selection (keeps scan radius).

## Screenshot

![Interactive scan stats with pies, speed, altitude, and climb bars](../images/scan-stats-and-filters.png)

Stats always reflect the **currently filtered** aircraft set so the charts stay consistent with the map and list.
