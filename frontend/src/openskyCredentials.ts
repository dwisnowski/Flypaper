/** Browser-stored OpenSky API credentials (not the shared flypaper snapshot). */

export const OPENSKY_CREDENTIALS_KEY = 'flypaper.opensky'
export const OPENSKY_CREDENTIALS_EVENT = 'flypaper-opensky-credentials'
export const OPENSKY_OPEN_EVENT = 'flypaper-opensky-open'

export interface OpenSkyCredentials {
  clientId: string
  clientSecret: string
}

export function loadOpenSkyCredentials(): OpenSkyCredentials | null {
  try {
    const raw = localStorage.getItem(OPENSKY_CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OpenSkyCredentials>
    const clientId = (parsed.clientId ?? '').trim()
    const clientSecret = (parsed.clientSecret ?? '').trim()
    if (!clientId || !clientSecret) return null
    return { clientId, clientSecret }
  } catch {
    return null
  }
}

export function saveOpenSkyCredentials(creds: OpenSkyCredentials | null): void {
  if (creds == null) {
    localStorage.removeItem(OPENSKY_CREDENTIALS_KEY)
  } else {
    localStorage.setItem(
      OPENSKY_CREDENTIALS_KEY,
      JSON.stringify({
        clientId: creds.clientId.trim(),
        clientSecret: creds.clientSecret.trim(),
      }),
    )
  }
  window.dispatchEvent(new Event(OPENSKY_CREDENTIALS_EVENT))
}

export function hasOpenSkyCredentials(): boolean {
  return loadOpenSkyCredentials() != null
}

export function openOpenSkyCredentialsPopover(): void {
  window.dispatchEvent(new Event(OPENSKY_OPEN_EVENT))
}

export function subscribeOpenSkyCredentials(listener: () => void): () => void {
  window.addEventListener(OPENSKY_CREDENTIALS_EVENT, listener)
  return () => window.removeEventListener(OPENSKY_CREDENTIALS_EVENT, listener)
}
