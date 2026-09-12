import { useCallback, useEffect, useState } from 'react'

export type LocationSource = 'geo' | 'home' | 'pending' | 'zip'

export interface GeoPosition {
  lat: number
  lon: number
  source: LocationSource
  error?: string
  label?: string
}

export interface GeolocationControls {
  refresh: () => void
  setFromZip: (lat: number, lon: number, label: string) => void
}

export function useGeolocation(
  homeLat: number,
  homeLon: number,
): GeoPosition & GeolocationControls {
  const [pos, setPos] = useState<GeoPosition>({
    lat: homeLat,
    lon: homeLon,
    source: 'pending',
  })

  const locate = useCallback(
    (forceFresh = false) => {
      if (!navigator.geolocation) {
        setPos({
          lat: homeLat,
          lon: homeLon,
          source: 'home',
          error: 'Geolocation unavailable in this browser',
        })
        return
      }

      setPos((prev) => ({
        ...prev,
        source: 'pending',
        error: undefined,
      }))

      navigator.geolocation.getCurrentPosition(
        (result) => {
          setPos({
            lat: result.coords.latitude,
            lon: result.coords.longitude,
            source: 'geo',
            label: undefined,
          })
        },
        (err) => {
          setPos((prev) => {
            // Keep a prior ZIP pick if the user already set one.
            if (prev.source === 'zip') {
              return { ...prev, error: err.message }
            }
            return {
              lat: homeLat,
              lon: homeLon,
              source: 'home',
              error: err.message,
            }
          })
        },
        {
          enableHighAccuracy: forceFresh,
          timeout: forceFresh ? 15000 : 8000,
          maximumAge: forceFresh ? 0 : 60_000,
        },
      )
    },
    [homeLat, homeLon],
  )

  useEffect(() => {
    locate(false)
  }, [locate])

  const refresh = useCallback(() => locate(true), [locate])

  const setFromZip = useCallback((lat: number, lon: number, label: string) => {
    setPos({ lat, lon, source: 'zip', label, error: undefined })
  }, [])

  return { ...pos, refresh, setFromZip }
}
