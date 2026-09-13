import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'
import type { Airframe, ClimbState, FilterState, Plane, Usage } from '../types'

const AIRFRAME_COLORS: Record<Airframe, string> = {
  jet: '#3dd6c6',
  turboprop: '#5ce0a0',
  piston: '#f4a261',
  heli: '#7aa2ff',
  uav: '#c77dff',
  other: '#8a9aaa',
}

const USAGE_COLORS: Record<Usage, string> = {
  commercial: '#3dd6c6',
  personal: '#f4a261',
  military: '#ef476f',
  unknown: '#8a9aaa',
}

const CLIMB_COLORS: Record<ClimbState, string> = {
  climbing: '#5ce0a0',
  level: '#3dd6c6',
  descending: '#f4a261',
  unknown: '#8a9aaa',
}

function countBy<T extends string>(items: T[]): { key: T; count: number }[] {
  const map = new Map<T, number>()
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1)
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

function statsOf(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const mean = sum / sorted.length
  return {
    min: sorted[0]!,
    mean,
    avg: mean,
    max: sorted[sorted.length - 1]!,
  }
}

function toggleIn<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hrs}h ${rem}m ago` : `${hrs}h ago`
}

function findByMetric(
  planes: Plane[],
  getValue: (p: Plane) => number | null | undefined,
  mode: 'min' | 'max' | 'nearest',
  target?: number,
): Plane | null {
  const scored = planes
    .map((p) => {
      const v = getValue(p)
      return v != null && Number.isFinite(v) ? { p, v } : null
    })
    .filter((x): x is { p: Plane; v: number } => x != null)
  if (!scored.length) return null
  if (mode === 'min') return scored.reduce((a, b) => (a.v <= b.v ? a : b)).p
  if (mode === 'max') return scored.reduce((a, b) => (a.v >= b.v ? a : b)).p
  const goal = target ?? 0
  return scored.reduce((a, b) => (Math.abs(a.v - goal) <= Math.abs(b.v - goal) ? a : b)).p
}

const clickableSx = {
  cursor: 'pointer',
  borderRadius: 1,
  transition: 'background-color 0.15s ease, outline-color 0.15s ease, opacity 0.15s ease',
  '&:hover': { bgcolor: 'action.hover' },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
} as const

function PieChart({
  slices,
  colors,
  activeKeys,
  onSelect,
  size = 112,
}: {
  slices: { key: string; count: number }[]
  colors: Record<string, string>
  activeKeys: string[]
  onSelect: (key: string) => void
  size?: number
}) {
  const total = slices.reduce((a, s) => a + s.count, 0) || 1
  const r = size / 2
  const ir = r * 0.55
  const hasActive = activeKeys.length > 0

  const arcs = slices.reduce<
    { key: string; d: string; color: string; count: number; angle: number }[]
  >((acc, s) => {
    const angle = acc.length ? acc[acc.length - 1]!.angle : -Math.PI / 2
    const sweep = (s.count / total) * Math.PI * 2
    const a0 = angle
    const a1 = angle + sweep
    const color = colors[s.key] ?? '#8a9aaa'
    if (sweep < 1e-6) {
      acc.push({ key: s.key, d: '', color, count: s.count, angle: a1 })
      return acc
    }
    if (sweep >= Math.PI * 2 - 1e-6) {
      const mid = a0 + Math.PI
      const x0 = r + r * Math.cos(a0)
      const y0 = r + r * Math.sin(a0)
      const xMid = r + r * Math.cos(mid)
      const yMid = r + r * Math.sin(mid)
      const xi0 = r + ir * Math.cos(a0)
      const yi0 = r + ir * Math.sin(a0)
      const xiMid = r + ir * Math.cos(mid)
      const yiMid = r + ir * Math.sin(mid)
      const d = `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${xMid} ${yMid} A ${r} ${r} 0 1 1 ${x0} ${y0} L ${xi0} ${yi0} A ${ir} ${ir} 0 1 0 ${xiMid} ${yiMid} A ${ir} ${ir} 0 1 0 ${xi0} ${yi0} Z`
      acc.push({ key: s.key, d, color, count: s.count, angle: a1 })
      return acc
    }
    const large = sweep > Math.PI ? 1 : 0
    const x0 = r + r * Math.cos(a0)
    const y0 = r + r * Math.sin(a0)
    const x1 = r + r * Math.cos(a1)
    const y1 = r + r * Math.sin(a1)
    const xi0 = r + ir * Math.cos(a0)
    const yi0 = r + ir * Math.sin(a0)
    const xi1 = r + ir * Math.cos(a1)
    const yi1 = r + ir * Math.sin(a1)
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0} Z`
    acc.push({ key: s.key, d, color, count: s.count, angle: a1 })
    return acc
  }, [])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown chart">
      {arcs.map((a) => {
        if (!a.d) return null
        const active = !hasActive || activeKeys.includes(a.key)
        return (
          <path
            key={a.key}
            d={a.d}
            fill={a.color}
            stroke="rgba(7,16,24,0.35)"
            strokeWidth={1}
            opacity={active ? 1 : 0.28}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(a.key)}
          >
            <title>{`${a.key}: ${a.count}`}</title>
          </path>
        )
      })}
      <circle cx={r} cy={r} r={ir * 0.92} fill="rgba(7,16,24,0.55)" />
      <text
        x={r}
        y={r}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#e8f1f2"
        fontSize={14}
        fontFamily="IBM Plex Mono, monospace"
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {total}
      </text>
    </svg>
  )
}

function Legend({
  slices,
  colors,
  activeKeys,
  onSelect,
}: {
  slices: { key: string; count: number }[]
  colors: Record<string, string>
  activeKeys: string[]
  onSelect: (key: string) => void
}) {
  const total = slices.reduce((a, s) => a + s.count, 0) || 1
  const hasActive = activeKeys.length > 0
  return (
    <Stack spacing={0.5} minWidth={0}>
      {slices.map((s) => {
        const active = !hasActive || activeKeys.includes(s.key)
        const selected = activeKeys.includes(s.key)
        return (
          <Box
            key={s.key}
            component="button"
            type="button"
            onClick={() => onSelect(s.key)}
            aria-pressed={selected}
            sx={{
              ...clickableSx,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              m: 0,
              px: 0.75,
              py: 0.35,
              border: 0,
              bgcolor: selected ? 'action.selected' : 'transparent',
              color: 'inherit',
              textAlign: 'left',
              opacity: active ? 1 : 0.45,
              font: 'inherit',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: 0.5,
                bgcolor: colors[s.key] ?? '#8a9aaa',
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              noWrap
              sx={{ textTransform: 'capitalize', flex: 1, minWidth: 0 }}
            >
              {s.key}
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'IBM Plex Mono, monospace', color: 'text.secondary' }}
            >
              {s.count} · {Math.round((s.count / total) * 100)}%
            </Typography>
          </Box>
        )
      })}
    </Stack>
  )
}

function StatBlock({
  title,
  unit,
  stats,
  format = (n) => Math.round(n).toLocaleString(),
  onPick,
}: {
  title: string
  unit: string
  stats: { min: number; mean: number; avg: number; max: number } | null
  format?: (n: number) => string
  onPick: (kind: 'min' | 'mean' | 'avg' | 'max') => void
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'rgba(7,16,24,0.28)',
        height: '100%',
      }}
    >
      <Typography variant="overline" color="text.secondary" display="block">
        {title} ({unit})
      </Typography>
      {stats == null ? (
        <Typography variant="body2" color="text.secondary">
          No data
        </Typography>
      ) : (
        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 0.5, fontFamily: 'IBM Plex Mono, monospace' }}
        >
          {(
            [
              ['min', stats.min],
              ['mean', stats.mean],
              ['avg', stats.avg],
              ['max', stats.max],
            ] as const
          ).map(([label, value]) => (
            <Box
              key={label}
              component="button"
              type="button"
              onClick={() => onPick(label)}
              title={
                label === 'min' || label === 'max'
                  ? `Select aircraft with ${label} ${title.toLowerCase()}`
                  : `Select aircraft closest to ${label} ${title.toLowerCase()}`
              }
              sx={{
                ...clickableSx,
                m: 0,
                px: 0.75,
                py: 0.5,
                border: 0,
                bgcolor: 'transparent',
                color: 'inherit',
                textAlign: 'left',
                font: 'inherit',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                {label}
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary.main">
                {format(value)}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function ClimbBars({
  slices,
  activeKeys,
  onSelect,
}: {
  slices: { key: ClimbState; count: number }[]
  activeKeys: ClimbState[]
  onSelect: (key: ClimbState) => void
}) {
  const max = Math.max(1, ...slices.map((s) => s.count))
  const order: ClimbState[] = ['climbing', 'level', 'descending', 'unknown']
  const byKey = new Map(slices.map((s) => [s.key, s.count]))
  const hasActive = activeKeys.length > 0
  return (
    <Stack spacing={1}>
      {order.map((key) => {
        const count = byKey.get(key) ?? 0
        const pct = (count / max) * 100
        const selected = activeKeys.includes(key)
        const dimmed = hasActive && !selected
        return (
          <Box
            key={key}
            component="button"
            type="button"
            disabled={count === 0}
            onClick={() => onSelect(key)}
            aria-pressed={selected}
            sx={{
              ...clickableSx,
              m: 0,
              p: 0.75,
              border: 0,
              bgcolor: selected ? 'action.selected' : 'transparent',
              color: 'inherit',
              textAlign: 'left',
              font: 'inherit',
              opacity: dimmed ? 0.45 : 1,
              width: '100%',
              '&.Mui-disabled, &:disabled': { opacity: 0.3, cursor: 'default' },
            }}
          >
            <Stack direction="row" justifyContent="space-between" mb={0.35}>
              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                {key}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontFamily: 'IBM Plex Mono, monospace', color: 'text.secondary' }}
              >
                {count}
              </Typography>
            </Stack>
            <Box
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: 'rgba(138,154,170,0.18)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${pct}%`,
                  height: '100%',
                  bgcolor: CLIMB_COLORS[key],
                  borderRadius: 999,
                  transition: 'width 0.45s ease',
                }}
              />
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}

export function ScanStatsPanel({
  planes,
  totalCount,
  fetchedAt,
  filters,
  onFiltersChange,
  onSelectPlane,
}: {
  planes: Plane[]
  /** Unfiltered scan size — shown when filters shrink the set. */
  totalCount?: number
  fetchedAt: number
  filters: FilterState
  onFiltersChange: (next: FilterState) => void
  onSelectPlane: (icao24: string) => void
}) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const ageSec = Math.max(0, Math.floor(nowMs / 1000 - fetchedAt))
  const stale = ageSec > 10 * 60
  const scannedAt = new Date(fetchedAt * 1000)

  const airframes = useMemo(() => countBy(planes.map((p) => p.airframe)), [planes])
  const usages = useMemo(() => countBy(planes.map((p) => p.usage)), [planes])
  const climbs = useMemo(
    () => countBy(planes.map((p) => p.climb_state ?? 'unknown')),
    [planes],
  )
  const speed = useMemo(
    () =>
      statsOf(planes.map((p) => p.speed_kts).filter((v): v is number => v != null && Number.isFinite(v))),
    [planes],
  )
  const altitude = useMemo(
    () =>
      statsOf(
        planes.map((p) => p.altitude_ft).filter((v): v is number => v != null && Number.isFinite(v)),
      ),
    [planes],
  )

  const toggleAirframe = (key: string) => {
    onFiltersChange({
      ...filters,
      airframes: toggleIn(filters.airframes, key as Airframe),
    })
  }
  const toggleUsage = (key: string) => {
    onFiltersChange({
      ...filters,
      usages: toggleIn(filters.usages, key as Usage),
    })
  }
  const toggleClimb = (key: ClimbState) => {
    onFiltersChange({
      ...filters,
      climbStates: toggleIn(filters.climbStates, key),
    })
  }

  const pickSpeed = (kind: 'min' | 'mean' | 'avg' | 'max') => {
    if (!speed) return
    const plane =
      kind === 'min'
        ? findByMetric(planes, (p) => p.speed_kts, 'min')
        : kind === 'max'
          ? findByMetric(planes, (p) => p.speed_kts, 'max')
          : findByMetric(planes, (p) => p.speed_kts, 'nearest', kind === 'avg' ? speed.avg : speed.mean)
    if (plane) onSelectPlane(plane.icao24)
  }

  const pickAltitude = (kind: 'min' | 'mean' | 'avg' | 'max') => {
    if (!altitude) return
    const plane =
      kind === 'min'
        ? findByMetric(planes, (p) => p.altitude_ft, 'min')
        : kind === 'max'
          ? findByMetric(planes, (p) => p.altitude_ft, 'max')
          : findByMetric(
              planes,
              (p) => p.altitude_ft,
              'nearest',
              kind === 'avg' ? altitude.avg : altitude.mean,
            )
    if (plane) onSelectPlane(plane.icao24)
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        animation: 'flypaper-stats-in 0.55s ease both',
        '@keyframes flypaper-stats-in': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'baseline' }}
        mb={1.5}
        flexWrap="wrap"
        useFlexGap
      >
        <Box>
          <Typography variant="overline" color="primary">
            Last scan
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'IBM Plex Mono, monospace',
              color: stale ? 'error.main' : 'text.primary',
            }}
          >
            {scannedAt.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
            })}
            <Typography
              component="span"
              variant="body1"
              sx={{
                ml: 1,
                color: stale ? 'error.main' : 'text.secondary',
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            >
              ({formatAgo(ageSec)})
            </Typography>
          </Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Aircraft in airspace
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontFamily: 'IBM Plex Mono, monospace', color: 'primary.main' }}
          >
            {planes.length.toLocaleString()}
            {totalCount != null && totalCount !== planes.length ? (
              <Typography
                component="span"
                variant="h6"
                sx={{ ml: 1, color: 'text.secondary', fontFamily: 'IBM Plex Mono, monospace' }}
              >
                / {totalCount.toLocaleString()}
              </Typography>
            ) : null}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1.1fr 1.1fr 1fr 1fr',
            lg: '1fr 1fr 1fr 1fr 1.15fr',
          },
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(7,16,24,0.28)',
          }}
        >
          <Typography variant="overline" color="text.secondary" display="block" mb={1}>
            By airframe
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PieChart
              slices={airframes}
              colors={AIRFRAME_COLORS}
              activeKeys={filters.airframes}
              onSelect={toggleAirframe}
            />
            <Legend
              slices={airframes}
              colors={AIRFRAME_COLORS}
              activeKeys={filters.airframes}
              onSelect={toggleAirframe}
            />
          </Stack>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(7,16,24,0.28)',
          }}
        >
          <Typography variant="overline" color="text.secondary" display="block" mb={1}>
            By usage
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PieChart
              slices={usages}
              colors={USAGE_COLORS}
              activeKeys={filters.usages}
              onSelect={toggleUsage}
            />
            <Legend
              slices={usages}
              colors={USAGE_COLORS}
              activeKeys={filters.usages}
              onSelect={toggleUsage}
            />
          </Stack>
        </Box>

        <StatBlock title="Speed" unit="kts" stats={speed} onPick={pickSpeed} />
        <StatBlock title="Altitude" unit="ft" stats={altitude} onPick={pickAltitude} />

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(7,16,24,0.28)',
            gridColumn: { xs: 'auto', sm: '1 / -1', md: 'auto', lg: 'auto' },
          }}
        >
          <Typography variant="overline" color="text.secondary" display="block" mb={1}>
            Climb state
          </Typography>
          <ClimbBars
            slices={climbs}
            activeKeys={filters.climbStates}
            onSelect={toggleClimb}
          />
        </Box>
      </Box>
    </Box>
  )
}
