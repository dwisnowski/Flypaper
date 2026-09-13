import KeyIcon from '@mui/icons-material/Key'
import KeyOffIcon from '@mui/icons-material/KeyOff'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import {
  OPENSKY_OPEN_EVENT,
  hasOpenSkyCredentials,
  loadOpenSkyCredentials,
  saveOpenSkyCredentials,
  subscribeOpenSkyCredentials,
} from '../openskyCredentials'

interface Props {
  /** When true, server .env can satisfy OpenSky without browser credentials. */
  serverConfigured?: boolean
}

export function OpenSkyCredentialsButton({ serverConfigured = false }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saved, setSaved] = useState(hasOpenSkyCredentials())
  const [message, setMessage] = useState<string | null>(null)

  const open = Boolean(anchor)

  useEffect(() => {
    return subscribeOpenSkyCredentials(() => setSaved(hasOpenSkyCredentials()))
  }, [])

  useEffect(() => {
    const onOpen = () => {
      // Prefer attaching to the toolbar button if present.
      const btn = document.getElementById('flypaper-opensky-credentials-btn')
      setAnchor(btn)
    }
    window.addEventListener(OPENSKY_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPENSKY_OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const existing = loadOpenSkyCredentials()
    setClientId(existing?.clientId ?? '')
    setClientSecret(existing?.clientSecret ?? '')
    setMessage(null)
  }, [open])

  const onSave = (event?: FormEvent) => {
    event?.preventDefault()
    const id = clientId.trim()
    const secret = clientSecret.trim()
    if (!id || !secret) {
      setMessage('Enter both client id and client secret.')
      return
    }
    saveOpenSkyCredentials({ clientId: id, clientSecret: secret })
    setSaved(true)
    setMessage('Saved in this browser only.')
  }

  const onClear = () => {
    saveOpenSkyCredentials(null)
    setClientId('')
    setClientSecret('')
    setSaved(false)
    setMessage('Cleared from this browser.')
  }

  const tooltip = saved
    ? 'OpenSky credentials saved in this browser'
    : serverConfigured
      ? 'Using server .env credentials (optional: save your own here)'
      : 'Add your OpenSky API credentials'

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          id="flypaper-opensky-credentials-btn"
          color={saved ? 'primary' : 'inherit'}
          aria-label="OpenSky API credentials"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          {saved || serverConfigured ? <KeyIcon /> : <KeyOffIcon />}
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 2, width: 340, mt: 1 } }}
      >
        <Stack component="form" spacing={1.5} onSubmit={(e) => onSave(e)}>
          <Stack direction="row" spacing={1} alignItems="center">
            <KeyIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>
              OpenSky credentials
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Paste the client id and secret from your OpenSky account. They stay in this
            browser&apos;s localStorage and are sent only to this Flypaper server when you
            scan. For local dev, a .env on the server still works without saving here.
          </Typography>
          {serverConfigured && !saved && (
            <Alert severity="info" sx={{ py: 0 }}>
              This server has .env credentials — scans work without saving in the browser.
            </Alert>
          )}
          <TextField
            autoFocus
            size="small"
            label="Client id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoComplete="off"
            fullWidth
          />
          <TextField
            size="small"
            label="Client secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            autoComplete="off"
            fullWidth
          />
          {message && (
            <Alert severity="success" sx={{ py: 0 }}>
              {message}
            </Alert>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" color="inherit" onClick={onClear} disabled={!saved && !clientId && !clientSecret}>
              Clear
            </Button>
            <Button size="small" variant="contained" type="submit">
              Save
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}
