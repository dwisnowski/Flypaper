/** Preferred ground-distance unit for UI (API / filters stay in km). */
export type DistanceUnit = 'mi' | 'km'

/** Statute mile → kilometer. */
export const KM_PER_MI = 1.609344

export const RADIUS_SLIDER: Record<
  DistanceUnit,
  { min: number; max: number; step: number }
> = {
  mi: { min: 5, max: 250, step: 5 },
  km: { min: 10, max: 400, step: 10 },
}

export function kmToMi(km: number): number {
  return km / KM_PER_MI
}

export function miToKm(mi: number): number {
  return mi * KM_PER_MI
}

export function fromKm(km: number, unit: DistanceUnit): number {
  return unit === 'mi' ? kmToMi(km) : km
}

export function toKm(value: number, unit: DistanceUnit): number {
  return unit === 'mi' ? miToKm(value) : value
}

/** Snap a km radius into the allowed slider range for the given unit. */
export function clampRadiusKm(radiusKm: number, unit: DistanceUnit): number {
  const { min, max, step } = RADIUS_SLIDER[unit]
  const display = fromKm(radiusKm, unit)
  const snapped = Math.round(display / step) * step
  const clamped = Math.min(max, Math.max(min, snapped))
  return toKm(clamped, unit)
}

/** Slider thumb value (display units) for a stored km radius. */
export function radiusSliderValue(radiusKm: number, unit: DistanceUnit): number {
  const { min, max, step } = RADIUS_SLIDER[unit]
  const display = fromKm(radiusKm, unit)
  const snapped = Math.round(display / step) * step
  return Math.min(max, Math.max(min, snapped))
}

export function formatDistanceKm(
  km: number | null | undefined,
  unit: DistanceUnit,
  digits = 1,
): string {
  if (km == null || !Number.isFinite(km)) return '—'
  const value = fromKm(km, unit)
  return `${value.toFixed(digits)} ${unit}`
}

export function unitLabel(unit: DistanceUnit): string {
  return unit === 'mi' ? 'mi' : 'km'
}
