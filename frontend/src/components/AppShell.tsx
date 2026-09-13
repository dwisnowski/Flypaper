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
import { ScanChromeProvider, useScanChrome } from './ScanChromeContext'

function ShellBar() {
  const [store] = useFlypaperStore()
  const location = useLocation()
  const { chrome } = useScanChrome()
  const credits = store.snapshot?.credits_remaining

  return (
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)' }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap', minHeight: { xs: 56, sm: 64 } }}>
        <FlightTakeoffIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 1 }}>
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
        {chrome ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              animation: 'flypaper-chrome-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
              '@keyframes flypaper-chrome-in': {
                from: { opacity: 0, transform: 'translateY(18px) scale(0.96)' },
                to: { opacity: 1, transform: 'translateY(0) scale(1)' },
              },
            }}
          >
            {chrome}
          </Box>
        ) : (
          <Typography
            variant="caption"
            sx={{ fontFamily: 'IBM Plex Mono, monospace', color: 'text.secondary' }}
          >
            credits {credits == null ? '—' : credits.toLocaleString()}
          </Typography>
        )}
        <QrAccessButton />
      </Toolbar>
    </AppBar>
  )
}

export function AppShell() {
  const [store] = useFlypaperStore()
  const theme = useMemo(() => createAppTheme(store.theme), [store.theme])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ScanChromeProvider>
        <ShellBar />
        <Outlet />
      </ScanChromeProvider>
    </ThemeProvider>
  )
}
