import * as THREE from 'three'

export const EARTH_RADIUS = 1.6
export const EARTH_KM = 6371

/** Scene-unit distance for a ground range in kilometers (orbit altitude above a surface target). */
export function kmToOrbitDistance(km: number): number {
  return (km / EARTH_KM) * EARTH_RADIUS
}

/** Zip / neighborhood floor, metro start height, full-globe ceiling. */
export const ZOOM_MIN_DISTANCE = kmToOrbitDistance(6)
export const ZOOM_START_DISTANCE = kmToOrbitDistance(220)
export const ZOOM_MAX_DISTANCE = EARTH_RADIUS * 4

/** Convert geodetic lat/lon/alt(m) to Three.js position on a Y-up globe. */
export function latLonToVec3(
  lat: number,
  lon: number,
  altMeters = 0,
  radius = EARTH_RADIUS,
): THREE.Vector3 {
  const alt = Math.max(0, altMeters) / 6_371_000
  const r = radius * (1 + alt * 8) // exaggerate altitude for visibility
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -r * Math.sin(phi) * Math.cos(theta)
  const z = r * Math.sin(phi) * Math.sin(theta)
  const y = r * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

export function isTouchDevice(): boolean {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1
}

export function qualityPreset() {
  const touch = isTouchDevice()
  return {
    touch,
    dpr: touch ? ([1, 1.25] as [number, number]) : ([1, 1.5] as [number, number]),
    antialias: false,
    particleCount: touch ? 2500 : 6000,
    earthSegments: touch ? 48 : 64,
    radarOpacity: 0.45,
  }
}
