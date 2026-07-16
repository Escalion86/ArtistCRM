import { useEffect, useState } from 'react'
import {
  getSyncRunState,
  subscribeSyncRunState,
  type SyncRunState,
} from '../sync/syncState'

export const useSyncRunState = () => {
  const [state, setState] = useState<SyncRunState | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeSyncRunState(setState)
    void getSyncRunState()
      .then(setState)
      .catch(() => undefined)
    return unsubscribe
  }, [])

  return state
}
