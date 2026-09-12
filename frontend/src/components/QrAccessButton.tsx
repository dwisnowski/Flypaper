import QrCode2Icon from '@mui/icons-material/QrCode2'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface AccessInfo {
  ips: string[]
  frontend_port: number
  path: string
  preferred_url: string
  urls: string[]
}

export function QrAccessButton() {
  const location = useLocation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<AccessInfo | null>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const open = Boolean(anchor)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ path: location.pathname || '/' })
      const res = await fetch(`/api/network/access?${params}`)
      if (!res.ok) throw new Error('Could not resolve LAN address')
      const data = (await res.json()) as AccessInfo
      setInfo(data)
      setUrl(data.preferred_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network lookup failed')
      // Fallback: current origin with hostname swap attempt
      const fallback = `${window.location.protocol}//${window.location.host}${location.pathname}`
      setUrl(fallback)
    } finally {
      setLoading(false)
    }
  }, [location.pathname])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <Tooltip title="QR code for iPad / phone (LAN)">
        <IconButton
          color="inherit"
          aria-label="Show LAN QR code"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <QrCode2Icon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 2, width: 300, mt: 1 } }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            Open on another device
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scan with your iPad camera. Same Wi‑Fi required. Vite must be reachable on your LAN IP.
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          )}

          {error && (
            <Alert severity="warning" sx={{ py: 0 }}>
              {error}
            </Alert>
          )}

          {!loading && url && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#fff',
              }}
            >
              <QRCodeSVG value={url} size={200} level="M" includeMargin />
            </Box>
          )}

          {info && info.urls.length > 1 && (
            <Select
              size="small"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
            >
              {info.urls.map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </Select>
          )}

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{
                flex: 1,
                fontFamily: 'IBM Plex Mono, monospace',
                wordBreak: 'break-all',
              }}
            >
              {url || '—'}
            </Typography>
            <Tooltip title={copied ? 'Copied' : 'Copy URL'}>
              <IconButton size="small" onClick={() => void copy()} disabled={!url}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}
