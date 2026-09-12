import { useMemo } from 'react'
import type { FilterState, Plane } from '../types'

export function useFilteredPlanes(planes: Plane[], filters: FilterState): Plane[] {
  return useMemo(() => {
    const q = filters.callsignQuery.trim().toLowerCase()
    const country = filters.countryQuery.trim().toLowerCase()

    return planes.filter((p) => {
      if (filters.airborneOnly && p.on_ground) return false
      if (filters.usages.length && !filters.usages.includes(p.usage)) return false
      if (filters.airframes.length && !filters.airframes.includes(p.airframe)) return false
      if (filters.climbStates.length) {
        const cs = p.climb_state ?? 'unknown'
        if (!filters.climbStates.includes(cs)) return false
      }

      const alt = p.altitude_ft ?? -1
      if (alt >= 0 && (alt < filters.altitudeMin || alt > filters.altitudeMax)) return false

      const dist = p.distance_km ?? 0
      if (dist > filters.distanceMax) return false

      const speed = p.speed_kts ?? 0
      if (speed < filters.speedMin) return false

      if (q) {
        const hay = `${p.callsign ?? ''} ${p.registration ?? ''} ${p.icao24}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (country) {
        if (!(p.origin_country ?? '').toLowerCase().includes(country)) return false
      }
      return true
    })
  }, [planes, filters])
}
