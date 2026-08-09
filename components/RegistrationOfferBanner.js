'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

const DISMISS_EVENT = 'registration-offer-dismissed'

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const RegistrationOfferBanner = ({ user }) => {
  const offer = user?.registrationOffer
  const storageKey = useMemo(
    () =>
      offer?.startedAt && user?._id
        ? `registration-offer:${user._id}:${offer.startedAt}`
        : '',
    [offer?.startedAt, user?._id]
  )
  const [mountedAt] = useState(() => Date.now())
  const subscribe = useCallback((callback) => {
    window.addEventListener('storage', callback)
    window.addEventListener(DISMISS_EVENT, callback)
    return () => {
      window.removeEventListener('storage', callback)
      window.removeEventListener(DISMISS_EVENT, callback)
    }
  }, [])
  const getSnapshot = useCallback(
    () => Boolean(storageKey && localStorage.getItem(storageKey) === 'dismissed'),
    [storageKey]
  )
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => true)
  const endsAt = offer?.endsAt ? new Date(offer.endsAt) : null
  const visible = Boolean(
    storageKey &&
      !dismissed &&
      endsAt &&
      !Number.isNaN(endsAt.getTime()) &&
      endsAt.getTime() > mountedAt
  )

  if (!visible) return null

  const close = () => {
    localStorage.setItem(storageKey, 'dismissed')
    window.dispatchEvent(new Event(DISMISS_EVENT))
  }

  return (
    <aside className="registration-offer-banner mx-3 mt-3 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 shadow-sm sm:mx-4 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">Ваш пробный тариф подключён</div>
          {offer.welcomeMessage ? (
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {offer.welcomeMessage}
            </p>
          ) : null}
          <p className="mt-2 text-sm">
            <strong>{offer.tariffTitle}</strong> доступен бесплатно до{' '}
            {formatDate(offer.endsAt)}.
          </p>
          {offer.featureLabels?.length > 0 ? (
            <p className="mt-1 text-xs text-emerald-800">
              Доступно: {offer.featureLabels.join(' • ')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть приветственное сообщение"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-emerald-800 hover:bg-emerald-100"
        >
          ×
        </button>
      </div>
    </aside>
  )
}

export default RegistrationOfferBanner
