import type { AppConfig, FlightPathResponse, Plane, ScanResponse } from './types'
import { loadOpenSkyCredentials } from './openskyCredentials'

const jsonHeaders = { 'Content-Type': 'application/json' }

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined),
  }
  const creds = loadOpenSkyCredentials()
  if (creds) {
    headers['X-OpenSky-Client-Id'] = creds.clientId
    headers['X-OpenSky-Client-Secret'] = creds.clientSecret
  }
  return headers
}


async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail =
        typeof body.detail === 'string'
          ? body.detail
          : body.detail?.message || JSON.stringify(body.detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchConfig(): Promise<AppConfig> {
  return handle(await fetch('/api/config'))
}

export async function fetchSnapshot(): Promise<ScanResponse | null> {
  const res = await fetch('/api/snapshot')
  if (res.status === 404) return null
  return handle(res)
}

export async function estimateCost(
  lat: number,
  lon: number,
  radius_km: number,
): Promise<{ credits_spent_estimate: number }> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius_km: String(radius_km),
  })
  return handle(await fetch(`/api/estimate?${params}`))
}

export async function scanSky(
  lat: number,
  lon: number,
  radius_km: number,
): Promise<ScanResponse> {
  return handle(
    await fetch('/api/scan', {
      method: 'POST',
      headers: authHeaders(jsonHeaders),
      body: JSON.stringify({ lat, lon, radius_km }),
    }),
  )
}

export interface ZipGeocodeResult {
  lat: number
  lon: number
  zip: string
  label: string
  country: string
}

export async function geocodeZip(zip: string): Promise<ZipGeocodeResult> {
  const params = new URLSearchParams({ zip })
  return handle(await fetch(`/api/geocode/zip?${params}`))
}

export async function fetchFlightPath(plane: Plane): Promise<FlightPathResponse> {
  return handle(
    await fetch(`/api/flight-path/${encodeURIComponent(plane.icao24)}`, {
      method: 'POST',
      headers: authHeaders(jsonHeaders),
      body: JSON.stringify({
        lat: plane.latitude,
        lon: plane.longitude,
        true_track: plane.true_track,
        velocity_ms: plane.velocity_ms,
        baro_altitude_m: plane.baro_altitude_m,
      }),
    }),
  )
}
