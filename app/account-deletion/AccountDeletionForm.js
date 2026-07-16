'use client'

import { useState } from 'react'

export default function AccountDeletionForm() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/account-deletion/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || 'Не удалось отправить запрос')
      setMessage(body.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить запрос')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <label className="flex flex-col gap-2 font-medium text-black">
        Телефон аккаунта
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 font-normal outline-none focus:border-amber-700"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 999 000-00-00"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-black">
        Email аккаунта
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 font-normal outline-none focus:border-amber-700"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.ru"
        />
      </label>
      <p className="text-xs text-gray-500">Достаточно заполнить одно поле. В целях безопасности мы не сообщаем, найден ли аккаунт.</p>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p> : null}
      <button type="submit" disabled={loading} className="min-h-12 cursor-pointer rounded-xl bg-red-700 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Отправляем…' : 'Запросить удаление аккаунта'}
      </button>
    </form>
  )
}
