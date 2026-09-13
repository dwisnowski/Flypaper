import type { FilterState, FlightPathResponse, ScanResponse } from '../types'
import { DEFAULT_FILTERS } from '../types'

export const STORE_KEY = 'flypaper.v1'
export const STORE_EVENT = 'flypaper-store'

export interface StoredLocation {
  lat: number
  lon: number
  source: 'geo' | 'home' | 'zip' | 'map' | 'pending'
  label?: string
}

/** ZIP or map-pin overrides live geolocation. */
export function isPinnedLocation(
  location: StoredLocation | null | undefined,
): location is StoredLocation & { source: 'zip' | 'map' } {
  return location?.source === 'zip' || location?.source === 'map'
}

export interface FlypaperStore {
  version: 1
  snapshot: ScanResponse | null
  pathCache: Record<string, FlightPathResponse>
  filters: FilterState
  theme: 'light' | 'dark'
  muted: boolean
  location: StoredLocation | null
  radiusKm: number
  selectedId: string | null
  radarEnabled: boolean
  updatedAt: number
}

function defaultTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const DEFAULT_STORE: FlypaperStore = {
  version: 1,
  snapshot: null,
  pathCache: {},
  filters: { ...DEFAULT_FILTERS },
  theme: 'dark',
  muted: false,
  location: null,
  radiusKm: 150,
  selectedId: null,
  radarEnabled: false,
  updatedAt: 0,
}

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STORE_EVENT))
  }
}

export function loadStore(): FlypaperStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) {
      const theme = localStorage.getItem('flypaper-theme')
      const muted = localStorage.getItem('flypaper-muted')
      const base: FlypaperStore = { ...DEFAULT_STORE, theme: defaultTheme(), filters: { ...DEFAULT_FILTERS } }
      if (theme === 'light' || theme === 'dark') base.theme = theme
      if (muted === '1') base.muted = true
      return base
    }
    const parsed = JSON.parse(raw) as Partial<FlypaperStore>
    return {
      ...DEFAULT_STORE,
      ...parsed,
      version: 1,
      filters: { ...DEFAULT_FILTERS, ...(parsed.filters ?? {}) },
      pathCache: parsed.pathCache ?? {},
    }
  } catch {
    return { ...DEFAULT_STORE, theme: defaultTheme(), filters: { ...DEFAULT_FILTERS } }
  }
}

export function saveStore(partial: Partial<FlypaperStore>): FlypaperStore {
  const next: FlypaperStore = {
    ...loadStore(),
    ...partial,
    version: 1,
    updatedAt: Date.now(),
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(next))
  localStorage.setItem('flypaper-theme', next.theme)
  localStorage.setItem('flypaper-muted', next.muted ? '1' : '0')
  emit()
  return next
}

export function subscribeStore(listener: () => void): () => void {
  window.addEventListener(STORE_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(STORE_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
