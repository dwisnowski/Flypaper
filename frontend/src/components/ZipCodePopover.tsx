import PinDropIcon from '@mui/icons-material/PinDrop'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import { geocodeZip } from '../api'

interface Props {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onResolved: (lat: number, lon: number, label: string) => void
}

export function ZipCodePopover({ anchorEl, open, onClose, onResolved }: Props) {
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
    }
  }, [open])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const value = zip.trim()
    if (!value) {
      setError('Enter a ZIP code')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await geocodeZip(value)
      onResolved(result.lat, result.lon, result.label)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not look up that ZIP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{
        sx: { p: 2, width: 300, mt: 1 },
      }}
    >
      <Stack component="form" spacing={1.5} onSubmit={(e) => void submit(e)}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PinDropIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            Enter ZIP code
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Location timed out or was blocked. Drop a US ZIP (or Canadian postal code) and we&apos;ll
          center the map there.
        </Typography>
        <TextField
          autoFocus
          size="small"
          label="ZIP / postal code"
          placeholder="94102"
          value={zip}
          onChange={(e) => setZip(e.target.value.toUpperCase())}
          error={Boolean(error)}
          helperText={error || ' '}
          disabled={loading}
          inputProps={{ maxLength: 10, 'aria-label': 'ZIP code' }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !zip.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'Looking up…' : 'Use this location'}
        </Button>
      </Stack>
    </Popover>
  )
}
