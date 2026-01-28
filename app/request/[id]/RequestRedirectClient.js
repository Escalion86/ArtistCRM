'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const RequestRedirectClient = ({ id }) => {
  const router = useRouter()

  useEffect(() => {
    if (!id) {
      router.replace('/cabinet/requests')
      return
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('openRequest', id)
      window.sessionStorage.setItem('openRequestAt', Date.now().toString())
    }
    router.replace(`/cabinet/requests?openRequest=${id}`)
  }, [id, router])

  return null
}

export default RequestRedirectClient
