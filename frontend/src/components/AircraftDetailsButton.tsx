import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState, type MouseEvent, type ReactNode } from 'react'
import type { Plane } from '../types'

interface Props {
  plane: Plane
  /** Visual size of the icon button. */
  size?: 'small' | 'medium'
}

function fmt(value: string | number | boolean | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—'
    return Number.isInteger(value) ? String(value) : value.toLocaleString()
  }
  return value
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="baseline">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ flexShrink: 0, minWidth: 96 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'IBM Plex Mono, monospace',
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="overline" color="primary.main" sx={{ lineHeight: 1.2 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  )
}

export function AircraftDetailsButton({ plane, size = 'small' }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = Boolean(anchor)

  const onOpen = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    event.preventDefault()
    setAnchor(event.currentTarget)
  }

  const onClose = () => setAnchor(null)

  const stop = (event: MouseEvent) => {
    event.stopPropagation()
  }

  const title = plane.callsign || plane.registration || plane.icao24

  return (
    <>
      <Tooltip title="Aircraft details">
        <IconButton
          size={size}
          aria-label={`Details for ${title}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={onOpen}
          onMouseDown={stop}
          onDoubleClick={stop}
          sx={{ flexShrink: 0 }}
        >
          <InfoOutlinedIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableScrollLock
        slotProps={{
          paper: {
            sx: { p: 2, maxWidth: 340, width: 'min(340px, calc(100vw - 32px))' },
            onClick: stop,
            onMouseDown: stop,
          },
        }}
      >
        <Stack spacing={1.75}>
          <Typography fontWeight={700} sx={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            {title}
          </Typography>

          <Section title="Identity">
            <DetailRow label="ICAO24" value={fmt(plane.icao24)} />
            <DetailRow label="Callsign" value={fmt(plane.callsign)} />
            <DetailRow label="Registration" value={fmt(plane.registration)} />
            <DetailRow label="Country" value={fmt(plane.origin_country)} />
            <DetailRow label="Squawk" value={fmt(plane.squawk)} />
          </Section>

          <Section title="Airframe">
            <DetailRow label="Manufacturer" value={fmt(plane.manufacturer)} />
            <DetailRow label="Model" value={fmt(plane.model)} />
            <DetailRow label="Typecode" value={fmt(plane.typecode)} />
            <DetailRow label="Class" value={fmt(plane.airframe)} />
            <DetailRow
              label="ADS-B cat"
              value={
                plane.category_label
                  ? plane.category != null
                    ? `${plane.category_label} (${plane.category})`
                    : plane.category_label
                  : fmt(plane.category)
              }
            />
          </Section>

          <Section title="Operator">
            <DetailRow label="Operator" value={fmt(plane.operator)} />
            <DetailRow label="Owner" value={fmt(plane.owner)} />
            <DetailRow label="Usage" value={fmt(plane.usage)} />
          </Section>

          <Section title="Flight">
            <DetailRow
              label="Altitude"
              value={
                plane.altitude_ft != null
                  ? `${Math.round(plane.altitude_ft).toLocaleString()} ft`
                  : '—'
              }
            />
            <DetailRow
              label="Speed"
              value={plane.speed_kts != null ? `${Math.round(plane.speed_kts)} kts` : '—'}
            />
            <DetailRow
              label="Track"
              value={plane.true_track != null ? `${Math.round(plane.true_track)}°` : '—'}
            />
            <DetailRow label="Climb" value={fmt(plane.climb_state)} />
            <DetailRow
              label="Distance"
              value={
                plane.distance_km != null ? `${plane.distance_km.toFixed(1)} km` : '—'
              }
            />
            <DetailRow label="On ground" value={fmt(plane.on_ground)} />
            <DetailRow
              label="Position"
              value={
                plane.latitude != null && plane.longitude != null
                  ? `${plane.latitude.toFixed(4)}, ${plane.longitude.toFixed(4)}`
                  : '—'
              }
            />
          </Section>
        </Stack>
      </Popover>
    </>
  )
}
