import { useCallback, useEffect, useRef, useState } from 'react'

const useOnboardingTown = (defaultTown = '', enabled = true) => {
  const [town, setTown] = useState(defaultTown)
  const [isDetected, setIsDetected] = useState(false)
  const editedRef = useRef(false)

  const changeTown = useCallback((value) => {
    editedRef.current = true
    setTown(value)
    setIsDetected(false)
  }, [])

  useEffect(() => {
    if (!enabled || defaultTown.trim() || editedRef.current) return undefined
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const detect = async () => {
      try {
        const response = await fetch('/api/site/detected-city', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) return
        const result = await response.json()
        const suggestion = result?.data?.town
        if (
          controller.signal.aborted ||
          editedRef.current ||
          !result?.success ||
          typeof suggestion !== 'string' ||
          !suggestion.trim() ||
          suggestion.length > 120
        )
          return

        setTown(suggestion.trim())
        setIsDetected(true)
      } catch {
        // Offline, timeout and GeoIP errors leave manual input available.
      } finally {
        clearTimeout(timeout)
      }
    }
    detect()

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [defaultTown, enabled])

  return { town, changeTown, isDetected }
}

export default useOnboardingTown
