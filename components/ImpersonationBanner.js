'use client'

import Button from '@components/Button'
import Notice from '@components/Notice'
import switchImpersonation from '@helpers/switchImpersonation'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'

const ImpersonationBanner = ({ user }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const impersonation = user?.impersonation

  if (!impersonation?.active) return null

  const handleRestore = async () => {
    setLoading(true)
    setError('')
    try {
      await switchImpersonation({ restore: true })
    } catch (switchError) {
      setError(switchError?.message || 'Не удалось вернуться в свой кабинет')
      setLoading(false)
    }
  }

  return (
    <Notice
      tone="warning"
      className="sticky top-2 z-20 mb-3 flex flex-col gap-3 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="font-semibold">Вы вошли от имени пользователя</div>
        <div className="text-sm">
          Все данные и действия относятся к кабинету этого пользователя.
        </div>
        {error ? <div className="mt-1 text-sm">{error}</div> : null}
      </div>
      <Button
        name="Вернуться в свой кабинет"
        icon={faArrowLeft}
        loading={loading}
        onClick={handleRestore}
        className="w-full sm:w-auto"
      />
    </Notice>
  )
}

export default ImpersonationBanner
