import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useFlypaperStore } from '../hooks/useFlypaperStore'
import { RADIUS_SLIDER, radiusSliderValue, toKm, unitLabel } from '../units'

export function RadiusSlider() {
  const [store, updateStore] = useFlypaperStore()
  const unit = store.distanceUnit
  const { min, max, step } = RADIUS_SLIDER[unit]
  const value = radiusSliderValue(store.radiusKm, unit)

  return (
    <Stack direction="row" spacing={2} alignItems="center" mb={2} maxWidth={420}>
      <Typography variant="body2" sx={{ minWidth: 110, fontFamily: 'IBM Plex Mono, monospace' }}>
        Radius {value} {unitLabel(unit)}
      </Typography>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => updateStore({ radiusKm: toKm(v as number, unit) })}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v} ${unitLabel(unit)}`}
        aria-label="Scan radius"
      />
    </Stack>
  )
}
