import DarkModeIcon from '@mui/icons-material/DarkMode'
import FilterListIcon from '@mui/icons-material/FilterList'
import LightModeIcon from '@mui/icons-material/LightMode'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import ThunderstormIcon from '@mui/icons-material/Thunderstorm'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { estimateCost, fetchConfig, fetchFlightPath, scanSky } from '../api'
import {
  hasOpenSkyCredentials,
  openOpenSkyCredentialsPopover,
} from '../openskyCredentials'
import { CreditGauge } from '../components/CreditGauge'
import { FilterDrawer } from '../components/FilterDrawer'
import { PlaneList } from '../components/PlaneList'
import { ScanButton } from '../components/ScanButton'
import { ZipCodePopover } from '../components/ZipCodePopover'
import { GlobeCanvas } from '../globe/GlobeCanvas'
import { useFilteredPlanes } from '../hooks/useFilteredPlanes'
import { useFlypaperStore } from '../hooks/useFlypaperStore'
import { useGeolocation } from '../hooks/useGeolocation'
import { useSounds } from '../hooks/useSounds'
import { loadStore, isPinnedLocation } from '../store/flypaperStore'
import type { AppConfig, FlightPathResponse } from '../types'

export default function GlobePage() {
  const [store, updateStore] = useFlypaperStore()
  const { muted, toggleMute, play } = useSounds(store.muted, (next) => updateStore({ muted: next }))

  const [config, setConfig] = useState<AppConfig>({
    home_lat: 37.7749,
    home_lon: -122.4194,
    default_radius_km: 150,
    daily_allowance: 4000,
    server_opensky_configured: false,
  })
  const geo = useGeolocation(config.home_lat, config.home_lon)

  const radiusKm = store.radiusKm
  const snapshot = store.snapshot
  const filters = store.filters
  const selectedId = store.selectedId
  const pathCache = store.pathCache
  const radarEnabled = store.radarEnabled

  const [estimate, setEstimate] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spentLast, setSpentLast] = useState<number | null>(null)
  const [zipAnchor, setZipAnchor] = useState<HTMLElement | null>(null)
  const [locationChipEl, setLocationChipEl] = useState<HTMLElement | null>(null)
  const [flightPath, setFlightPath] = useState<FlightPathResponse | null>(null)
  const [pathLoading, setPathLoading] = useState(false)
  const zipOpen = Boolean(zipAnchor)

  const openZipPopover = useCallback(
    (anchor?: HTMLElement | null) => {
      setZipAnchor(anchor ?? locationChipEl)
    },
    [locationChipEl],
  )

  const filtered = useFilteredPlanes(snapshot?.planes ?? [], filters)

  const pinnedLocation = isPinnedLocation(store.location) ? store.location : null
  const observerLat = pinnedLocation ? pinnedLocation.lat : geo.lat
  const observerLon = pinnedLocation ? pinnedLocation.lon : geo.lon
  const locationSource = pinnedLocation
    ? pinnedLocation.source
    : geo.source === 'pending'
      ? 'pending'
      : geo.source

  useEffect(() => {
    void fetchConfig()
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : 'Config failed'))
  }, [])

  useEffect(() => {
    if (geo.source === 'home' && geo.error && !isPinnedLocation(store.location)) {
      setError(`Location unavailable: ${geo.error}. Enter a ZIP code to continue.`)
      if (locationChipEl) setZipAnchor(locationChipEl)
    }
  }, [geo.source, geo.error, locationChipEl, store.location])

  useEffect(() => {
    if (locationSource === 'zip' || locationSource === 'map' || locationSource === 'geo') {
      setError(null)
    }
  }, [locationSource])

  useEffect(() => {
    if (isPinnedLocation(store.location)) return
    updateStore({
      location: { lat: geo.lat, lon: geo.lon, source: geo.source },
    })
  }, [geo.lat, geo.lon, geo.source, store.location, updateStore])

  useEffect(() => {
    if (locationSource === 'pending') return
    void estimateCost(observerLat, observerLon, radiusKm)
      .then((r) => setEstimate(r.credits_spent_estimate))
      .catch(() => setEstimate(1))
  }, [observerLat, observerLon, locationSource, radiusKm])

  const onScan = useCallback(async () => {
    play('scan')
    setScanning(true)
    setError(null)
    if (!hasOpenSkyCredentials() && !config.server_opensky_configured) {
      openOpenSkyCredentialsPopover()
      setError('Add your OpenSky client id and secret (key icon), or configure .env for local use.')
      setScanning(false)
      return
    }
    try {
      const result = await scanSky(observerLat, observerLon, radiusKm)
      const stillSelected =
        selectedId != null && result.planes.some((p) => p.icao24 === selectedId)
          ? selectedId
          : null
      updateStore({
        snapshot: result,
        pathCache: {},
        selectedId: stillSelected,
        filters: { ...filters, distanceMax: radiusKm },
        radiusKm,
      })
      setFlightPath(null)
      setSpentLast(result.credits_spent_estimate)
      play('credit')
    } catch (e) {
      play('error')
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }, [filters, observerLat, observerLon, play, radiusKm, selectedId, updateStore, config.server_opensky_configured])

  const selectPlane = useCallback(
    (icao24: string) => {
      play('click')
      updateStore({ selectedId: selectedId === icao24 ? null : icao24 })
    },
    [play, selectedId, updateStore],
  )

  useEffect(() => {
    if (!selectedId) {
      setFlightPath(null)
      return
    }
    const plane = (snapshot?.planes ?? []).find((p) => p.icao24 === selectedId)
    if (!plane) {
      setFlightPath(null)
      return
    }
    const cached = pathCache[selectedId]
    if (cached) {
      setFlightPath(cached)
      return
    }
    let cancelled = false
    setPathLoading(true)
    void fetchFlightPath(plane)
      .then((path) => {
        if (cancelled) return
        updateStore({ pathCache: { ...loadStore().pathCache, [selectedId]: path } })
        setFlightPath(path)
        play('credit')
      })
      .catch((e) => {
        if (cancelled) return
        play('error')
        setError(e instanceof Error ? e.message : 'Failed to load flight path')
      })
      .finally(() => {
        if (!cancelled) setPathLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, snapshot?.planes, play])

  const creditsRemaining = snapshot?.credits_remaining ?? null

  return (
    <>
      <Toolbar sx={{ gap: 1, justifyContent: 'flex-end', minHeight: '48px !important' }}>
        <Tooltip
          title={
            locationSource === 'pending'
              ? 'Getting your location…'
              : locationSource === 'geo'
                ? 'Using your current location — click to refresh'
                : locationSource === 'zip'
                  ? `Using ZIP${store.location?.label ? `: ${store.location.label}` : ''} — click to change`
                  : locationSource === 'map'
                    ? `Using map pin${store.location?.label ? `: ${store.location.label}` : ''} — click to change`
                    : `Using home fallback — click for ZIP or GPS`
          }
        >
          <Chipish
            ref={setLocationChipEl}
            icon={<MyLocationIcon fontSize="small" />}
            label={
              locationSource === 'pending'
                ? 'Locating…'
                : locationSource === 'zip'
                  ? store.location?.label?.split(',')[0] || 'ZIP'
                  : locationSource === 'map'
                    ? 'MAP'
                    : locationSource
            }
            onClick={(event) => {
              play('click')
              setError(null)
              if (locationSource === 'home' || locationSource === 'zip' || locationSource === 'map') {
                openZipPopover(event.currentTarget)
              } else {
                geo.refresh()
              }
            }}
            disabled={locationSource === 'pending'}
          />
        </Tooltip>
        <Tooltip title={radarEnabled ? 'Hide RainViewer radar' : 'Show RainViewer radar'}>
          <IconButton
            color={radarEnabled ? 'primary' : 'default'}
            onClick={() => {
              play('click')
              updateStore({ radarEnabled: !radarEnabled })
            }}
          >
            <ThunderstormIcon />
          </IconButton>
        </Tooltip>
        <IconButton onClick={() => { play('click'); toggleMute() }}>
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
        <IconButton
          onClick={() => {
            play('click')
            updateStore({ theme: store.theme === 'dark' ? 'light' : 'dark' })
          }}
        >
          {store.theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
        <IconButton onClick={() => { play('click'); setFilterOpen(true) }}>
          <FilterListIcon />
        </IconButton>
      </Toolbar>

      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          mb={2}
        >
          <Box flex={1}>
            <Typography variant="overline" color="primary">
              WebGL globe
            </Typography>
            <Typography variant="h4" gutterBottom>
              Flypaper in 3D
            </Typography>
            <Typography color="text.secondary" maxWidth={560}>
              Same OpenSky snapshot as the map page (saved in this browser). Toggle RainViewer radar
              for live weather. Optimized for iPad Safari.
            </Typography>
          </Box>
          <CreditGauge
            remaining={creditsRemaining}
            allowance={config.daily_allowance}
            spentLast={spentLast}
          />
          <ScanButton
            onScan={onScan}
            loading={scanning}
            disabled={locationSource === 'pending' || creditsRemaining === 0}
            estimate={estimate}
          />
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" mb={2} maxWidth={420}>
          <Typography variant="body2" sx={{ minWidth: 110, fontFamily: 'IBM Plex Mono, monospace' }}>
            Radius {radiusKm} km
          </Typography>
          <Slider
            value={radiusKm}
            min={50}
            max={400}
            step={10}
            onChange={(_, v) => updateStore({ radiusKm: v as number })}
            valueLabelDisplay="auto"
          />
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {pathLoading && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Loading flight path (~4 track credits)…
          </Typography>
        )}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ height: { lg: '70vh' } }}>
          <Paper
            sx={{
              flex: 2,
              minHeight: 420,
              height: { xs: 420, lg: '100%' },
              overflow: 'hidden',
              position: 'relative',
              bgcolor: '#050b12',
            }}
          >
            <GlobeCanvas
              planes={filtered}
              selectedId={selectedId}
              onSelect={selectPlane}
              flightPath={flightPath}
              observerLat={observerLat}
              observerLon={observerLon}
              radarEnabled={radarEnabled}
            />
            <Box
              sx={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: 'rgba(7,16,24,0.82)',
                color: '#e8f1f2',
                fontSize: 11,
                fontFamily: 'IBM Plex Mono, monospace',
                maxWidth: 280,
              }}
            >
              Drag to orbit · pinch/scroll to zoom
              {radarEnabled ? (
                <>
                  <br />
                  Radar ©{' '}
                  <a href="https://www.rainviewer.com/" style={{ color: '#3dd6c6' }}>
                    RainViewer
                  </a>
                </>
              ) : null}
              {flightPath?.destination ? (
                <>
                  <br />→ {flightPath.destination.label}
                </>
              ) : null}
            </Box>
          </Paper>
          <Paper sx={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box px={2} py={1.5} borderBottom={1} borderColor="divider">
              <Typography variant="subtitle1" fontWeight={700}>
                {filtered.length} aircraft
              </Typography>
            </Box>
            <Box flex={1} overflow="auto">
              <PlaneList planes={filtered} selectedId={selectedId} onSelect={selectPlane} />
            </Box>
          </Paper>
        </Stack>
      </Container>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={(next) => updateStore({ filters: next })}
        maxDistance={radiusKm}
      />
      <ZipCodePopover
        open={zipOpen}
        anchorEl={zipAnchor}
        onClose={() => setZipAnchor(null)}
        onResolved={(lat, lon, label) => {
          play('credit')
          updateStore({ location: { lat, lon, source: 'zip', label } })
          setError(null)
        }}
      />
    </>
  )
}

function Chipish({
  icon,
  label,
  onClick,
  disabled,
  ref,
}: {
  icon: ReactNode
  label: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  ref?: (node: HTMLButtonElement | null) => void
}) {
  return (
    <Box
      component="button"
      type="button"
      ref={ref}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label="Set location"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.5,
        m: 0,
        borderRadius: 999,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'transparent',
        color: 'inherit',
        typography: 'caption',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'IBM Plex Mono, monospace',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
      }}
    >
      {icon}
      {label}
    </Box>
  )
}
