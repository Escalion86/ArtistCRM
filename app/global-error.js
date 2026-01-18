'use client'

import PropTypes from 'prop-types'
import { useEffect } from 'react'

import { sendClientLog } from '@helpers/clientLog'

const GlobalError = ({ error, reset }) => {
  useEffect(() => {
    sendClientLog({
      type: 'react-error',
      message: error?.message,
      stack: error?.stack,
      digest: error?.digest,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  }, [error])

  return (
    <html lang="ru">
      <body>
        <h2>Произошла ошибка</h2>
        <button type="button" onClick={() => reset()}>
          Повторить
        </button>
      </body>
    </html>
  )
}

GlobalError.propTypes = {
  error: PropTypes.shape({
    digest: PropTypes.string,
    message: PropTypes.string,
    stack: PropTypes.string,
  }),
  reset: PropTypes.func.isRequired,
}

GlobalError.defaultProps = {
  error: null,
}

export default GlobalError
