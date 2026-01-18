'use client'

import PropTypes from 'prop-types'
import { useEffect } from 'react'

import { sendClientLog } from '@helpers/clientLog'

const MAX_LENGTH = 2000

const safeToString = (value) => {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return JSON.stringify(value)
  } catch (error) {
    return String(value)
  }
}

const truncate = (value) => {
  const text = safeToString(value)
  if (!text || text.length <= MAX_LENGTH) return text
  return `${text.slice(0, MAX_LENGTH)}...`
}

const ClientErrorLogger = ({ enabled }) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const handleError = (event) => {
      try {
        const error = event?.error
        sendClientLog({
          type: 'error',
          message: truncate(event?.message || error?.message),
          stack: truncate(error?.stack),
          source: event?.filename,
          line: event?.lineno,
          column: event?.colno,
          url: window.location.href,
          userAgent: navigator.userAgent,
        })
      } catch (error) {
        return undefined
      }
    }

    const handleRejection = (event) => {
      try {
        const reason = event?.reason
        sendClientLog({
          type: 'unhandledrejection',
          message: truncate(reason?.message || reason),
          stack: truncate(reason?.stack),
          url: window.location.href,
          userAgent: navigator.userAgent,
        })
      } catch (error) {
        return undefined
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [enabled])

  return null
}

ClientErrorLogger.propTypes = {
  enabled: PropTypes.bool,
}

ClientErrorLogger.defaultProps = {
  enabled: false,
}

export default ClientErrorLogger
