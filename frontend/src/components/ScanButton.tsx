import RadarIcon from '@mui/icons-material/Radar'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { keyframes, styled } from '@mui/material/styles'

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(61, 214, 198, 0.55); }
  70% { box-shadow: 0 0 0 22px rgba(61, 214, 198, 0); }
  100% { box-shadow: 0 0 0 0 rgba(61, 214, 198, 0); }
`

const sweepSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const ScanBtn = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'compact',
})<{ compact?: boolean }>(({ theme, compact }) => ({
  minWidth: compact ? 128 : 200,
  minHeight: compact ? 36 : 56,
  fontSize: compact ? '0.85rem' : '1.05rem',
  paddingInline: compact ? 14 : undefined,
  animation: `${pulse} 2.2s ease-out infinite`,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: theme.palette.mode === 'dark' ? '#04201c' : '#fff',
  '&:hover': {
    filter: 'brightness(1.08)',
  },
  '&.Mui-disabled': {
    animation: 'none',
  },
}))

const SweepRing = styled('span')({
  position: 'relative',
  width: 22,
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: -4,
    borderRadius: '50%',
    border: '2px solid transparent',
    borderTopColor: 'currentColor',
    animation: `${sweepSpin} 0.9s linear infinite`,
  },
})

interface Props {
  onScan: () => void
  loading: boolean
  disabled?: boolean
  estimate: number
  compact?: boolean
}

export function ScanButton({ onScan, loading, disabled, estimate, compact = false }: Props) {
  return (
    <Stack alignItems="center" spacing={compact ? 0 : 0.5}>
      <ScanBtn
        compact={compact}
        variant="contained"
        size={compact ? 'small' : 'large'}
        onClick={onScan}
        disabled={disabled || loading}
        startIcon={loading ? <SweepRing /> : <RadarIcon fontSize={compact ? 'small' : 'medium'} />}
      >
        {loading ? 'Scanning…' : 'Scan sky'}
      </ScanBtn>
      {!compact && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'IBM Plex Mono, monospace' }}
        >
          ~{estimate} credit{estimate === 1 ? '' : 's'} per scan
        </Typography>
      )}
    </Stack>
  )
}
