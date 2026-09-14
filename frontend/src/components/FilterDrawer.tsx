import FilterListIcon from '@mui/icons-material/FilterList'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Airframe, ClimbState, FilterState, Usage } from '../types'
import type { DistanceUnit } from '../units'
import { RADIUS_SLIDER, fromKm, toKm, unitLabel } from '../units'

const USAGES: Usage[] = ['military', 'commercial', 'personal', 'unknown']
const AIRFRAMES: Airframe[] = ['jet', 'turboprop', 'piston', 'heli', 'uav', 'other']
const CLIMBS: ClimbState[] = ['climbing', 'descending', 'level']

interface Props {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (next: FilterState) => void
  maxDistance: number
  distanceUnit: DistanceUnit
}

function toggleIn<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  maxDistance,
  distanceUnit,
}: Props) {
  const { min, step } = RADIUS_SLIDER[distanceUnit]
  const maxDisplay = Math.max(fromKm(maxDistance, distanceUnit), min)
  const rawValue = fromKm(filters.distanceMax, distanceUnit)
  const valueDisplay = Math.min(
    Math.max(Math.round(rawValue / step) * step, min),
    maxDisplay,
  )

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 340, p: 2 } }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <FilterListIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1 }}>
          Filters
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close filters">
          ✕
        </IconButton>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Filters apply to your last snapshot — they never spend credits.
      </Typography>

      <Typography variant="overline">Usage</Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
        {USAGES.map((u) => (
          <Chip
            key={u}
            label={u}
            size="small"
            color={filters.usages.includes(u) ? 'primary' : 'default'}
            variant={filters.usages.includes(u) ? 'filled' : 'outlined'}
            onClick={() => onChange({ ...filters, usages: toggleIn(filters.usages, u) })}
          />
        ))}
      </Stack>

      <Typography variant="overline">Airframe</Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
        {AIRFRAMES.map((a) => (
          <Chip
            key={a}
            label={a}
            size="small"
            color={filters.airframes.includes(a) ? 'secondary' : 'default'}
            variant={filters.airframes.includes(a) ? 'filled' : 'outlined'}
            onClick={() => onChange({ ...filters, airframes: toggleIn(filters.airframes, a) })}
          />
        ))}
      </Stack>

      <Typography variant="overline">Climb state</Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
        {CLIMBS.map((c) => (
          <Chip
            key={c}
            label={c}
            size="small"
            variant={filters.climbStates.includes(c) ? 'filled' : 'outlined'}
            onClick={() =>
              onChange({ ...filters, climbStates: toggleIn(filters.climbStates, c) })
            }
          />
        ))}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="overline">Altitude (ft)</Typography>
      <Box px={1} mb={2}>
        <Slider
          value={[filters.altitudeMin, filters.altitudeMax]}
          min={0}
          max={45000}
          step={500}
          valueLabelDisplay="auto"
          onChange={(_, v) => {
            const [minAlt, maxAlt] = v as number[]
            onChange({ ...filters, altitudeMin: minAlt, altitudeMax: maxAlt })
          }}
        />
      </Box>

      <Typography variant="overline">Max distance ({unitLabel(distanceUnit)})</Typography>
      <Box px={1} mb={2}>
        <Slider
          value={valueDisplay}
          min={min}
          max={maxDisplay}
          step={step}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${Math.round(v)} ${unitLabel(distanceUnit)}`}
          onChange={(_, v) =>
            onChange({ ...filters, distanceMax: toKm(v as number, distanceUnit) })
          }
        />
      </Box>

      <Typography variant="overline">Min speed (kts)</Typography>
      <Box px={1} mb={2}>
        <Slider
          value={filters.speedMin}
          min={0}
          max={500}
          step={10}
          valueLabelDisplay="auto"
          onChange={(_, v) => onChange({ ...filters, speedMin: v as number })}
        />
      </Box>

      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={filters.airborneOnly}
              onChange={(_, checked) => onChange({ ...filters, airborneOnly: checked })}
            />
          }
          label="Airborne only"
        />
      </FormGroup>

      <Stack spacing={1.5} mt={2}>
        <TextField
          size="small"
          label="Callsign / reg / ICAO"
          value={filters.callsignQuery}
          onChange={(e) => onChange({ ...filters, callsignQuery: e.target.value })}
        />
        <TextField
          size="small"
          label="Origin country"
          value={filters.countryQuery}
          onChange={(e) => onChange({ ...filters, countryQuery: e.target.value })}
        />
      </Stack>
    </Drawer>
  )
}
