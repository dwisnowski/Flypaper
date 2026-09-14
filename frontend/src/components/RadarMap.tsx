import Box from '@mui/material/Box'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useFlypaperStore } from '../hooks/useFlypaperStore'
import type { FlightPathResponse, Plane } from '../types'
import { formatDistanceKm } from '../units'
import {
  fetchRainViewerMaps,
  latestRadarFrame,
  radarLeafletTemplate,
} from '../weather/rainviewer'
import { AircraftDetailsButton } from './AircraftDetailsButton'

const LONG_PRESS_MS = 550
const LONG_PRESS_MOVE_PX = 12

function planeIcon(track: number | null, selected: boolean) {
  const rotation = track ?? 0
  const color = selected ? '#f4a261' : '#3dd6c6'
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><g transform="rotate(${rotation} 12 12)"><path fill="${color}" stroke="#04201c" stroke-width="0.6" d="M12 2 L15 10 L22 11 L15 12.5 L12 22 L9 12.5 L2 11 L9 10 Z"/></g></svg>`,
  )
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  })
}

const youIcon = L.divIcon({
  className: 'flypaper-you-marker',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#f4a261;border:2px solid #fff;box-shadow:0 0 10px #f4a261"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const destIcon = L.divIcon({
  className: 'flypaper-dest-marker',
  html: `<div style="width:12px;height:12px;border-radius:2px;background:#ef476f;border:2px solid #fff;transform:rotate(45deg);box-shadow:0 0 8px #ef476f"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

function MapEffects({
  lat,
  lon,
  selected,
  flightPath,
}: {
  lat: number
  lon: number
  selected: Plane | null
  flightPath: FlightPathResponse | null
}) {
  const map = useMap()

  useEffect(() => {
    const fix = () => map.invalidateSize()
    fix()
    const t1 = window.setTimeout(fix, 100)
    const t2 = window.setTimeout(fix, 400)
    window.addEventListener('resize', fix)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', fix)
    }
  }, [map])

  useEffect(() => {
    const pts: L.LatLngExpression[] = []
    if (flightPath) {
      for (const p of flightPath.flown) pts.push([p.lat, p.lon])
      for (const p of flightPath.remaining) pts.push([p.lat, p.lon])
    }
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 10, animate: true })
      return
    }
    if (selected?.latitude != null && selected.longitude != null) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 9), {
        duration: 0.8,
      })
      return
    }
    map.setView([lat, lon])
    map.invalidateSize()
  }, [lat, lon, selected, flightPath, map])

  return null
}

/** Click-and-hold / long-press empty map to pick a new observer location. */
function LongPressSetLocation({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void
}) {
  const map = useMap()
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const container = map.getContainer()
    let timer: number | null = null
    let start: { x: number; y: number; latlng: L.LatLng } | null = null
    let suppressClickUntil = 0

    const clearTimer = () => {
      if (timer != null) {
        window.clearTimeout(timer)
        timer = null
      }
      start = null
      setRing(null)
    }

    const isIgnoredTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false
      return Boolean(
        target.closest('.leaflet-marker-icon') ||
          target.closest('.leaflet-control') ||
          target.closest('.leaflet-popup'),
      )
    }

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return
      if (isIgnoredTarget(ev.target)) return
      const rect = container.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      const latlng = map.containerPointToLatLng(L.point(x, y))
      start = { x, y, latlng }
      setRing({ x, y })
      timer = window.setTimeout(() => {
        if (!start) return
        const picked = start.latlng
        clearTimer()
        suppressClickUntil = Date.now() + 400
        map.dragging.disable()
        window.setTimeout(() => map.dragging.enable(), 180)
        try {
          navigator.vibrate?.(18)
        } catch {
          /* ignore */
        }
        onPickRef.current(picked.lat, picked.lng)
      }, LONG_PRESS_MS)
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!start) return
      const rect = container.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      const dx = x - start.x
      const dy = y - start.y
      if (dx * dx + dy * dy > LONG_PRESS_MOVE_PX * LONG_PRESS_MOVE_PX) {
        clearTimer()
      }
    }

    const onPointerUp = () => clearTimer()

    const onClickCapture = (ev: MouseEvent) => {
      if (Date.now() < suppressClickUntil) {
        ev.stopPropagation()
        ev.preventDefault()
      }
    }

    const onContextMenu = (ev: Event) => {
      if (Date.now() < suppressClickUntil) ev.preventDefault()
    }

    const onDragStart = () => clearTimer()

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointercancel', onPointerUp)
    container.addEventListener('pointerleave', onPointerUp)
    container.addEventListener('click', onClickCapture, true)
    container.addEventListener('contextmenu', onContextMenu)
    map.on('dragstart', onDragStart)

    return () => {
      clearTimer()
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerUp)
      container.removeEventListener('pointerleave', onPointerUp)
      container.removeEventListener('click', onClickCapture, true)
      container.removeEventListener('contextmenu', onContextMenu)
      map.off('dragstart', onDragStart)
    }
  }, [map])

  if (!ring) return null
  return createPortal(
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: ring.x,
        top: ring.y,
        width: 44,
        height: 44,
        marginLeft: -22,
        marginTop: -22,
        borderRadius: '50%',
        border: '2px solid rgba(244,162,97,0.95)',
        boxShadow: '0 0 0 6px rgba(244,162,97,0.2)',
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'flypaper-longpress 0.55s linear forwards',
      }}
    />,
    map.getContainer(),
  )
}

interface Props {
  lat: number
  lon: number
  radiusKm: number
  planes: Plane[]
  selectedId: string | null
  onSelect: (icao24: string) => void
  onPickLocation?: (lat: number, lon: number) => void
  scanning: boolean
  flightPath: FlightPathResponse | null
  pathLoading?: boolean
  radarEnabled?: boolean
}

export function RadarMap({
  lat,
  lon,
  radiusKm,
  planes,
  selectedId,
  onSelect,
  onPickLocation,
  scanning,
  flightPath,
  pathLoading,
  radarEnabled = false,
}: Props) {
  const [store] = useFlypaperStore()
  const unit = store.distanceUnit
  const selected = useMemo(
    () => planes.find((p) => p.icao24 === selectedId) ?? null,
    [planes, selectedId],
  )

  const flownPositions = useMemo(
    () => (flightPath?.flown ?? []).map((p) => [p.lat, p.lon] as [number, number]),
    [flightPath],
  )
  const remainingPositions = useMemo(
    () => (flightPath?.remaining ?? []).map((p) => [p.lat, p.lon] as [number, number]),
    [flightPath],
  )

  const [radarUrl, setRadarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!radarEnabled) {
      setRadarUrl(null)
      return
    }
    let cancelled = false
    void fetchRainViewerMaps()
      .then((maps) => {
        if (cancelled) return
        const frame = latestRadarFrame(maps)
        if (!frame) return
        setRadarUrl(radarLeafletTemplate(maps.host, frame.path))
      })
      .catch(() => {
        if (!cancelled) setRadarUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [radarEnabled])

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 420,
        borderRadius: 3,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: '#0a1620',
        boxShadow: scanning ? '0 0 0 2px rgba(61,214,198,0.55)' : 'none',
        transition: 'box-shadow 0.4s ease',
        '@keyframes flypaper-longpress': {
          from: { transform: 'scale(0.35)', opacity: 0.35 },
          to: { transform: 'scale(1)', opacity: 1 },
        },
        '& .leaflet-container': {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#0a1620',
          font: 'inherit',
          zIndex: 0,
          touchAction: 'manipulation',
        },
        '& .flypaper-you-marker, & .flypaper-dest-marker, & .leaflet-div-icon': {
          background: 'transparent',
          border: 'none',
        },
      }}
    >
      <MapContainer
        center={[lat, lon]}
        zoom={8}
        scrollWheelZoom
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        {radarUrl && (
          <TileLayer
            attribution='Radar by <a href="https://www.rainviewer.com/">RainViewer</a>'
            url={radarUrl}
            opacity={0.55}
            zIndex={10}
            maxZoom={7}
          />
        )}
        <MapEffects lat={lat} lon={lon} selected={selected} flightPath={flightPath} />
        {onPickLocation ? <LongPressSetLocation onPick={onPickLocation} /> : null}
        <Circle
          center={[lat, lon]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#3dd6c6', weight: 1.5, fillColor: '#3dd6c6', fillOpacity: 0.06 }}
        />
        <Marker position={[lat, lon]} icon={youIcon}>
          <Popup>
            You are here
            <br />
            Press &amp; hold the map to move
          </Popup>
        </Marker>

        {flownPositions.length >= 2 && (
          <Polyline
            positions={flownPositions}
            pathOptions={{ color: '#3dd6c6', weight: 3, opacity: 0.9 }}
          />
        )}
        {remainingPositions.length >= 2 && (
          <Polyline
            positions={remainingPositions}
            pathOptions={{
              color: '#ef476f',
              weight: 3,
              opacity: 0.85,
              dashArray: '10 8',
            }}
          />
        )}
        {flightPath?.destination && (
          <Marker
            position={[flightPath.destination.lat, flightPath.destination.lon]}
            icon={destIcon}
          >
            <Popup>
              <strong>{flightPath.destination.label}</strong>
              <br />
              {flightPath.destination.kind === 'airport'
                ? 'Estimated destination'
                : 'Projected heading'}
              {flightPath.destination.distance_km != null
                ? ` · ${formatDistanceKm(flightPath.destination.distance_km, unit)}`
                : ''}
            </Popup>
          </Marker>
        )}

        {planes.map((p) => {
          if (p.latitude == null || p.longitude == null) return null
          return (
            <Marker
              key={p.icao24}
              position={[p.latitude, p.longitude]}
              icon={planeIcon(p.true_track, p.icao24 === selectedId)}
              eventHandlers={{ click: () => onSelect(p.icao24) }}
            >
              <Popup>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong>{p.callsign || p.registration || p.icao24}</strong>
                    <br />
                    {p.model || p.typecode || p.airframe}
                    <br />
                    {p.altitude_ft != null
                      ? `${Math.round(p.altitude_ft).toLocaleString()} ft`
                      : '—'}
                    {p.distance_km != null ? ` · ${formatDistanceKm(p.distance_km, unit)}` : ''}
                    {pathLoading && p.icao24 === selectedId ? (
                      <>
                        <br />
                        <em>Loading flight path…</em>
                      </>
                    ) : null}
                    {flightPath && flightPath.icao24 === p.icao24 && flightPath.destination ? (
                      <>
                        <br />
                        → {flightPath.destination.label}
                      </>
                    ) : null}
                  </div>
                  <AircraftDetailsButton plane={p} />
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      {scanning && (
        <Box
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            zIndex: 500,
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(61,214,198,0.18) 40deg, transparent 80deg)',
            animation: 'flypaper-sweep 1.4s linear infinite',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <Box
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 600,
          px: 1.25,
          py: 0.75,
          borderRadius: 2,
          bgcolor: 'rgba(7,16,24,0.82)',
          color: '#e8f1f2',
          fontSize: 11,
          lineHeight: 1.35,
          border: '1px solid rgba(244,162,97,0.35)',
          fontFamily: 'IBM Plex Mono, monospace',
          pointerEvents: 'none',
          maxWidth: 200,
        }}
      >
        Press &amp; hold to set location
      </Box>
      {(pathLoading || flightPath) && (
        <Box
          sx={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            zIndex: 600,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: 'rgba(7,16,24,0.82)',
            color: '#e8f1f2',
            maxWidth: 320,
            fontSize: 12,
            lineHeight: 1.4,
            border: '1px solid rgba(61,214,198,0.35)',
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          {pathLoading ? (
            'Fetching OpenSky track (~4 track credits)…'
          ) : (
            <>
              <span style={{ color: '#3dd6c6' }}>━</span> flown{' '}
              <span style={{ color: '#ef476f' }}>╌</span> remaining
              {flightPath?.track_credits_remaining != null
                ? ` · track credits ${flightPath.track_credits_remaining}`
                : ''}
              <br />
              {flightPath?.note}
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
