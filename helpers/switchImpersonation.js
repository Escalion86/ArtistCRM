import { signIn } from 'next-auth/react'

const readErrorMessage = (payload) =>
  payload?.error?.message || 'Не удалось переключить учётную запись'

const switchImpersonation = async ({ targetUserId, restore = false }) => {
  const response = await fetch('/api/impersonation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(
      restore ? { action: 'restore' } : { action: 'start', targetUserId }
    ),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ticket) {
    throw new Error(readErrorMessage(payload))
  }

  const result = await signIn('impersonation', {
    ticket: payload.ticket,
    redirect: false,
    callbackUrl: '/cabinet/eventsUpcoming',
  })
  if (!result?.ok) {
    throw new Error('Не удалось создать сессию пользователя')
  }

  window.location.assign(result.url || '/cabinet/eventsUpcoming')
}

export default switchImpersonation
