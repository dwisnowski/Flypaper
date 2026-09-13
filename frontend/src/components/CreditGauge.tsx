import { keyframes } from '@mui/material/styles'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

const tick = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.08); }
  100% { transform: scale(1); }
`

interface Props {
  remaining: number | null
  allowance?: number
  spentLast?: number | null
  compact?: boolean
}

export function CreditGauge({ remaining, allowance = 4000, spentLast, compact = false }: Props) {
  const [display, setDisplay] = useState(remaining)
  const [bump, setBump] = useState(false)

  useEffect(() => {
    if (remaining == null) {
      setDisplay(null)
      return
    }
    if (display == null) {
      setDisplay(remaining)
      return
    }
    if (display === remaining) return

    const from = display
    const to = remaining
    const steps = Math.min(12, Math.abs(from - to))
    let i = 0
    setBump(true)
    const id = window.setInterval(() => {
      i += 1
      const t = i / steps
      setDisplay(Math.round(from + (to - from) * t))
      if (i >= steps) {
        window.clearInterval(id)
        setDisplay(to)
        setBump(false)
      }
    }, 40)
    return () => window.clearInterval(id)
  }, [remaining]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = display ?? allowance
  const pct = Math.max(0, Math.min(100, (value / allowance) * 100))
  const low = display != null && display < 200

  if (compact) {
    return (
      <Box
        sx={{
          px: 1.25,
          py: 0.65,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: low ? 'error.main' : 'divider',
          minWidth: 148,
          animation: bump ? `${tick} 0.35s ease` : undefined,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Credits
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontWeight: 700,
              color: low ? 'error.main' : 'primary.main',
            }}
          >
            {display == null ? '—' : display.toLocaleString()}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              /{allowance.toLocaleString()}
            </Typography>
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={display == null ? 0 : pct}
          color={low ? 'error' : 'primary'}
          sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
        />
        {spentLast != null && spentLast > 0 && (
          <Typography variant="caption" color="secondary.main" display="block" mt={0.25}>
            −{spentLast} last
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: low ? 'error.main' : 'divider',
        minWidth: 220,
        animation: bump ? `${tick} 0.35s ease` : undefined,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.5}>
        <Typography variant="overline" color="text.secondary">
          Credits left
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'IBM Plex Mono, monospace',
            color: low ? 'error.main' : 'primary.main',
          }}
        >
          {display == null ? '—' : display.toLocaleString()}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={display == null ? 0 : pct}
        color={low ? 'error' : 'primary'}
        sx={{ height: 8, borderRadius: 4 }}
      />
      <Stack direction="row" justifyContent="space-between" mt={0.75}>
        <Typography variant="caption" color="text.secondary">
          / {allowance.toLocaleString()} daily
        </Typography>
        {spentLast != null && spentLast > 0 && (
          <Typography variant="caption" color="secondary.main">
            −{spentLast} last scan
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
