import { useCallback, useEffect, useState } from 'react'
import { loadStore, saveStore, subscribeStore, type FlypaperStore } from '../store/flypaperStore'

export function useFlypaperStore(): [FlypaperStore, (partial: Partial<FlypaperStore>) => void] {
  const [store, setStore] = useState<FlypaperStore>(() => loadStore())

  useEffect(() => subscribeStore(() => setStore(loadStore())), [])

  const update = useCallback((partial: Partial<FlypaperStore>) => {
    setStore(saveStore(partial))
  }, [])

  return [store, update]
}
