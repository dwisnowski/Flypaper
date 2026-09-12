/** RainViewer public weather maps (personal/educational use — attribute RainViewer). */

export interface RadarFrame {
  time: number
  path: string
}

export interface RainViewerMaps {
  generated: number
  host: string
  radar: {
    past: RadarFrame[]
    nowcast: RadarFrame[]
  }
  satellite?: {
    infrared?: RadarFrame[]
  }
}

let cached: { at: number; data: RainViewerMaps } | null = null
const CACHE_MS = 60_000

export async function fetchRainViewerMaps(): Promise<RainViewerMaps> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data

  // Prefer backend proxy (CORS-safe); fall back to public API.
  let res = await fetch('/api/weather/radar-maps')
  if (!res.ok) {
    res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
  }
  if (!res.ok) throw new Error('Failed to load RainViewer radar maps')
  const data = (await res.json()) as RainViewerMaps
  cached = { at: Date.now(), data }
  return data
}

export function latestRadarFrame(maps: RainViewerMaps): RadarFrame | null {
  const past = maps.radar.past ?? []
  if (past.length) return past[past.length - 1]
  const nowcast = maps.radar.nowcast ?? []
  return nowcast[0] ?? null
}

/** World-ish radar tile (z=0) stretched onto globe UVs — good enough for hobbyist overlay. */
export function radarWorldTileUrl(host: string, path: string, size: 256 | 512 = 512): string {
  const base = host.replace(/\/$/, '')
  return `${base}${path}/${size}/0/0/0/2/1_1.png`
}

export function radarTileUrl(
  host: string,
  path: string,
  z: number,
  x: number,
  y: number,
  size: 256 | 512 = 256,
): string {
  const base = host.replace(/\/$/, '')
  return `${base}${path}/${size}/${z}/${x}/${y}/2/1_1.png`
}

export function radarLeafletTemplate(host: string, path: string): string {
  const base = host.replace(/\/$/, '')
  return `${base}${path}/256/{z}/{x}/{y}/2/1_1.png`
}
