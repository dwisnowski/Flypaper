import SettingsIcon from '@mui/icons-material/Settings'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState, type MouseEvent } from 'react'
import { useFlypaperStore } from '../hooks/useFlypaperStore'
import type { DistanceUnit } from '../units'
import { clampRadiusKm } from '../units'

export function SettingsButton() {
  const [store, updateStore] = useFlypaperStore()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = Boolean(anchor)

  const setUnit = (_: MouseEvent<HTMLElement>, next: DistanceUnit | null) => {
    if (!next) return
    updateStore({
      distanceUnit: next,
      radiusKm: clampRadiusKm(store.radiusKm, next),
    })
  }

  return (
    <>
      <Tooltip title="Settings">
        <IconButton
          id="flypaper-settings-btn"
          color={open ? 'primary' : 'default'}
          onClick={(event) => setAnchor(event.currentTarget)}
          aria-label="Open settings"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, width: 280 } } }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Distance unit</Typography>
          <Typography variant="caption" color="text.secondary">
            Scan radius and aircraft distances. OpenSky requests still use kilometers under the
            hood.
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={store.distanceUnit}
            onChange={setUnit}
            aria-label="Distance unit"
          >
            <ToggleButton value="mi">Miles</ToggleButton>
            <ToggleButton value="km">Kilometers</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Popover>
    </>
  )
}
