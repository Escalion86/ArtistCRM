'use client'

import switchImpersonation from '@helpers/switchImpersonation'
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

const ImpersonationReturnButton = ({ onRestore }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRestore = async () => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      await switchImpersonation({ restore: true })
      onRestore?.()
    } catch (switchError) {
      setError(switchError?.message || 'Не удалось вернуться в свой кабинет')
      setLoading(false)
    }
  }

  return (
    <div className="mt-auto border-t border-red-300/60 p-2">
      <button
        type="button"
        onClick={handleRestore}
        disabled={loading}
        aria-busy={loading}
        className="flex min-h-12 w-full cursor-pointer items-center gap-x-3 overflow-hidden rounded-lg bg-red-600 px-2 py-2 text-left font-semibold whitespace-nowrap text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:bg-red-500"
        title="Вернуться в свой кабинет разработчика"
      >
        <span className="flex h-8 w-8 min-w-8 items-center justify-center">
          <FontAwesomeIcon
            icon={loading ? faSpinner : faArrowLeft}
            className={loading ? 'h-5 w-5 animate-spin' : 'h-5 w-5'}
          />
        </span>
        <span>{loading ? 'Возвращаемся…' : 'Вернуться в свой кабинет'}</span>
      </button>
      <div className="sr-only" role="status" aria-live="polite">
        {loading ? 'Выполняется возврат в кабинет разработчика' : ''}
      </div>
      {error ? (
        <div
          className="mt-1 px-2 text-xs leading-tight text-white"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}

export default ImpersonationReturnButton
