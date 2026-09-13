export type Usage = 'military' | 'commercial' | 'personal' | 'unknown'
export type Airframe = 'jet' | 'turboprop' | 'piston' | 'heli' | 'uav' | 'other'
export type ClimbState = 'climbing' | 'descending' | 'level' | 'unknown'

export interface Plane {
  icao24: string
  callsign: string | null
  origin_country: string | null
  longitude: number | null
  latitude: number | null
  baro_altitude_m: number | null
  geo_altitude_m: number | null
  on_ground: boolean
  velocity_ms: number | null
  true_track: number | null
  vertical_rate_ms: number | null
  squawk: string | null
  category: number | null
  category_label: string | null
  distance_km: number | null
  altitude_ft: number | null
  speed_kts: number | null
  climb_state: ClimbState | null
  usage: Usage
  airframe: Airframe
  typecode: string | null
  model: string | null
  operator: string | null
  registration: string | null
}

export interface ScanResponse {
  planes: Plane[]
  credits_remaining: number | null
  credits_spent_estimate: number
  fetched_at: number
  observer_lat: number
  observer_lon: number
  radius_km: number
  bbox: { lamin: number; lamax: number; lomin: number; lomax: number }
  plane_count: number
}

export interface AppConfig {
  home_lat: number
  home_lon: number
  default_radius_km: number
  daily_allowance: number
  /** True when the API process has OPEN_SKY_* in .env (local-dev fallback). */
  server_opensky_configured: boolean
}

export interface FilterState {
  usages: Usage[]
  airframes: Airframe[]
  altitudeMin: number
  altitudeMax: number
  distanceMax: number
  speedMin: number
  climbStates: ClimbState[]
  airborneOnly: boolean
  callsignQuery: string
  countryQuery: string
}

export const DEFAULT_FILTERS: FilterState = {
  usages: [],
  airframes: [],
  altitudeMin: 0,
  altitudeMax: 50000,
  distanceMax: 2000,
  speedMin: 0,
  climbStates: [],
  airborneOnly: true,
  callsignQuery: '',
  countryQuery: '',
}

export interface LatLonPoint {
  lat: number
  lon: number
}

export interface DestinationInfo {
  lat: number
  lon: number
  kind: 'airport' | 'heading' | string
  label: string
  icao: string | null
  distance_km: number | null
}

export interface FlightPathResponse {
  icao24: string
  callsign: string | null
  flown: LatLonPoint[]
  remaining: LatLonPoint[]
  destination: DestinationInfo | null
  track_credits_remaining: number | null
  track_credits_spent_estimate: number
  note: string
  start_time: number | null
  end_time: number | null
}
