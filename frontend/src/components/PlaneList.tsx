import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Plane } from '../types'

interface Props {
  planes: Plane[]
  selectedId: string | null
  onSelect: (icao24: string) => void
}

export function PlaneList({ planes, selectedId, onSelect }: Props) {
  if (!planes.length) {
    return (
      <Box p={2}>
        <Typography color="text.secondary" variant="body2">
          No aircraft match your filters. Widen the net or scan again.
        </Typography>
      </Box>
    )
  }

  return (
    <List dense disablePadding sx={{ maxHeight: '100%', overflow: 'auto' }}>
      {planes.map((p) => (
        <ListItemButton
          key={p.icao24}
          selected={p.icao24 === selectedId}
          onClick={() => onSelect(p.icao24)}
          sx={{ alignItems: 'flex-start', py: 1.25 }}
        >
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={700} sx={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {p.callsign || p.registration || p.icao24}
                </Typography>
                <Chip label={p.airframe} size="small" variant="outlined" />
                <Chip label={p.usage} size="small" color="primary" variant="outlined" />
              </Stack>
            }
            secondary={
              <Typography variant="caption" color="text.secondary" component="span">
                {p.distance_km != null ? `${p.distance_km.toFixed(1)} km · ` : ''}
                {p.altitude_ft != null ? `${Math.round(p.altitude_ft).toLocaleString()} ft · ` : ''}
                {p.speed_kts != null ? `${Math.round(p.speed_kts)} kts · ` : ''}
                {p.origin_country || '—'}
                {p.model ? ` · ${p.model}` : ''}
              </Typography>
            }
          />
        </ListItemButton>
      ))}
    </List>
  )
}
