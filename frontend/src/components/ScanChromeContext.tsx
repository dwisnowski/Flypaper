import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface ScanChromeContextValue {
  chrome: ReactNode
  setChrome: (node: ReactNode) => void
}

const ScanChromeContext = createContext<ScanChromeContextValue | null>(null)

export function ScanChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<ReactNode>(null)
  const setChrome = useCallback((node: ReactNode) => {
    setChromeState(node)
  }, [])
  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome])
  return <ScanChromeContext.Provider value={value}>{children}</ScanChromeContext.Provider>
}

export function useScanChrome() {
  const ctx = useContext(ScanChromeContext)
  if (!ctx) throw new Error('useScanChrome requires ScanChromeProvider')
  return ctx
}

/** Publish AppBar chrome while mounted; clear on unmount. */
export function useScanChromeSlot(node: ReactNode, enabled: boolean) {
  const { setChrome } = useScanChrome()
  useEffect(() => {
    if (!enabled) {
      setChrome(null)
      return
    }
    setChrome(node)
    return () => setChrome(null)
  }, [enabled, node, setChrome])
}
