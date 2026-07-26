'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
]

const AcquisitionTracker = () => {
  const pathname = usePathname()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (!ATTRIBUTION_PARAMS.some((key) => searchParams.has(key))) return

    const payload = {
      source: searchParams.get('utm_source') || '',
      medium: searchParams.get('utm_medium') || '',
      campaign: searchParams.get('utm_campaign') || '',
      content: searchParams.get('utm_content') || '',
      term: searchParams.get('utm_term') || '',
      yclid: searchParams.get('yclid') || '',
      landingPath: pathname || '/',
    }

    fetch('/api/acquisition/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => null)
  }, [pathname])

  return null
}

export default AcquisitionTracker
