import PublicIcon from '@mui/icons-material/Public'
import MapIcon from '@mui/icons-material/Map'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CssBaseline from '@mui/material/CssBaseline'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'
import { useMemo } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useFlypaperStore } from '../hooks/useFlypaperStore'
import { createAppTheme } from '../theme'
import { QrAccessButton } from './QrAccessButton'

export function AppShell() {
  const [store] = useFlypaperStore()
  const theme = useMemo(() => createAppTheme(store.theme), [store.theme])
  const location = useLocation()
  const credits = store.snapshot?.credits_remaining

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)' }}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <FlightTakeoffIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700, mr: 2 }}>
            Flypaper
          </Typography>
          <Button
            component={RouterLink}
            to="/"
            startIcon={<MapIcon />}
            color={location.pathname === '/' ? 'primary' : 'inherit'}
            variant={location.pathname === '/' ? 'contained' : 'text'}
            size="small"
          >
            Map
          </Button>
          <Button
            component={RouterLink}
            to="/globe"
            startIcon={<PublicIcon />}
            color={location.pathname.startsWith('/globe') ? 'primary' : 'inherit'}
            variant={location.pathname.startsWith('/globe') ? 'contained' : 'text'}
            size="small"
          >
            Globe
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            variant="caption"
            sx={{ fontFamily: 'IBM Plex Mono, monospace', color: 'text.secondary' }}
          >
            credits {credits == null ? '—' : credits.toLocaleString()}
          </Typography>
          <QrAccessButton />
        </Toolbar>
      </AppBar>
      <Outlet />
    </ThemeProvider>
  )
}
