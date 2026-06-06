'use client'

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

const isProductionSW =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'production'

const SERVICE_WORKER_READY_TIMEOUT_MS = 3000
const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60000

const PUSH_DIAGNOSTIC_MESSAGES = {
  unsupported: 'Браузер или режим приложения не поддерживает push-уведомления',
  disabled_outside_production:
    'Push-регистрация отключена вне production-сборки',
  registration_failed:
    'Не удалось зарегистрировать Service Worker для push',
  activation_timeout:
    'Service Worker зарегистрирован, но не активировался вовремя. На первом запуске PWA это может занять до минуты',
  push_manager_unavailable:
    'Service Worker активен, но PushManager недоступен',
  registration_not_ready: 'Service Worker еще не готов для push',
}

const getWindowLocation = () => {
  if (typeof window !== 'undefined' && window.location) return window.location
  if (typeof location !== 'undefined') return location
  return null
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const areByteArraysEqual = (left, right) => {
  if (!left || !right) return false
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

const getSubscriptionApplicationServerKey = (subscription) => {
  const key = subscription?.options?.applicationServerKey
  if (!key) return null
  if (key instanceof ArrayBuffer) return new Uint8Array(key)
  if (ArrayBuffer.isView(key)) {
    return new Uint8Array(key.buffer, key.byteOffset, key.byteLength)
  }
  return null
}

const waitForServiceWorkerReady = async (timeoutMs = SERVICE_WORKER_READY_TIMEOUT_MS) => {
  if (!navigator?.serviceWorker?.ready) return null

  let timeoutId = null

  try {
    return await Promise.race([
      navigator.serviceWorker.ready.catch(() => null),
      new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}

const getRegistrationWorker = (registration) =>
  registration?.active || registration?.waiting || registration?.installing || null

const resolveExistingRegistration = async () => {
  const serviceWorker = navigator?.serviceWorker
  if (!serviceWorker) return null

  const directScopeRegistration = await serviceWorker
    .getRegistration?.('/')
    .catch(() => null)
  if (directScopeRegistration) return directScopeRegistration

  const currentPageRegistration = await serviceWorker.getRegistration?.().catch(() => null)
  if (currentPageRegistration) return currentPageRegistration

  const registrations = await serviceWorker.getRegistrations?.().catch(() => [])
  if (!Array.isArray(registrations) || registrations.length === 0) return null

  const pageLocation = getWindowLocation()
  const currentHref = String(pageLocation?.href || '')
  const currentOrigin = String(pageLocation?.origin || '')

  const sameOriginRegistrations = registrations.filter((registration) => {
    const scope = String(registration?.scope || '')
    return currentOrigin ? scope.startsWith(currentOrigin) : true
  })
  const scopedRegistrations = (sameOriginRegistrations.length > 0
    ? sameOriginRegistrations
    : registrations
  ).filter((registration) => {
    const scope = String(registration?.scope || '')
    return currentHref ? currentHref.startsWith(scope) : true
  })

  const candidates =
    scopedRegistrations.length > 0
      ? scopedRegistrations
      : sameOriginRegistrations.length > 0
        ? sameOriginRegistrations
        : registrations

  return candidates.sort((left, right) => {
    const leftIsActive = Boolean(left?.active)
    const rightIsActive = Boolean(right?.active)
    if (leftIsActive !== rightIsActive) {
      return rightIsActive ? 1 : -1
    }
    const leftScopeLength = String(left?.scope || '').length
    const rightScopeLength = String(right?.scope || '').length
    return rightScopeLength - leftScopeLength
  })[0]
}

const waitForRegistrationActivation = async (
  registration,
  timeoutMs = SERVICE_WORKER_ACTIVATION_TIMEOUT_MS
) => {
  if (!registration) return null
  if (registration?.active) return registration

  const worker = getRegistrationWorker(registration)
  if (!worker?.addEventListener) return registration

  let timeoutId = null

  return await new Promise((resolve) => {
    const finish = (value) => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      worker.removeEventListener?.('statechange', handleStateChange)
      resolve(value)
    }

    const handleStateChange = () => {
      if (registration?.active || worker.state === 'activated') {
        finish(registration)
      }
    }

    worker.addEventListener('statechange', handleStateChange)
    timeoutId = window.setTimeout(() => finish(registration), timeoutMs)
    handleStateChange()
  })
}

const getPushRegistrationWithDetails = async () => {
  if (!isPushSupported()) {
    return {
      ok: false,
      registration: null,
      reason: 'unsupported',
      message: PUSH_DIAGNOSTIC_MESSAGES.unsupported,
    }
  }
  if (!isProductionSW) {
    return {
      ok: false,
      registration: null,
      reason: 'disabled_outside_production',
      message: PUSH_DIAGNOSTIC_MESSAGES.disabled_outside_production,
    }
  }

  const existing = await resolveExistingRegistration()
  if (existing?.pushManager) {
    return {
      ok: true,
      registration: existing,
      reason: '',
      message: '',
    }
  }

  let registered = null
  let registerError = null
  if (!existing) {
    registered = await navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) => {
        registerError = error
        return null
      })
  }

  const readyRegistration = await waitForServiceWorkerReady()
  if (readyRegistration?.active) {
    return {
      ok: true,
      registration: readyRegistration,
      reason: '',
      message: '',
    }
  }

  const pendingRegistration = existing || registered || readyRegistration
  const activatedRegistration =
    await waitForRegistrationActivation(pendingRegistration)
  if (activatedRegistration?.active && activatedRegistration?.pushManager) {
    return {
      ok: true,
      registration: activatedRegistration,
      reason: '',
      message: '',
    }
  }
  if (pendingRegistration?.pushManager) {
    return {
      ok: false,
      registration: pendingRegistration,
      reason: 'activation_timeout',
      message: PUSH_DIAGNOSTIC_MESSAGES.activation_timeout,
    }
  }
  if (registerError) {
    return {
      ok: false,
      registration: null,
      reason: 'registration_failed',
      message: `${PUSH_DIAGNOSTIC_MESSAGES.registration_failed}: ${registerError.message || 'unknown error'}`,
    }
  }
  if (pendingRegistration) {
    return {
      ok: false,
      registration: pendingRegistration,
      reason: 'push_manager_unavailable',
      message: PUSH_DIAGNOSTIC_MESSAGES.push_manager_unavailable,
    }
  }
  return {
    ok: false,
    registration: null,
    reason: 'registration_not_ready',
    message: PUSH_DIAGNOSTIC_MESSAGES.registration_not_ready,
  }
}

const getPushRegistration = async () => {
  const result = await getPushRegistrationWithDetails()
  return result?.registration || null
}

const fetchPushPublicKey = async () => {
  const keyResponse = await fetch('/api/push/public-key')
  const keyPayload = await keyResponse.json().catch(() => ({}))
  if (!keyResponse.ok || !keyPayload?.data?.publicKey) {
    throw new Error(keyPayload?.error || 'Не удалось получить VAPID ключ')
  }
  return keyPayload.data.publicKey
}

const savePushSubscription = async (subscription) => {
  const saveResponse = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })

  if (!saveResponse.ok) {
    const savePayload = await saveResponse.json().catch(() => ({}))
    throw new Error(savePayload?.error || 'Не удалось сохранить push-подписку')
  }
}

const syncPushSubscription = async ({
  registration,
  subscription,
  ensureLocalSubscription = false,
  forceNewSubscription = false,
} = {}) => {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'permission_not_granted' }
  }

  let registrationDetails = null
  const currentRegistration =
    registration ||
    ((registrationDetails = await getPushRegistrationWithDetails()),
    registrationDetails?.registration || null)
  if (!currentRegistration?.pushManager) {
    return {
      ok: false,
      reason: registrationDetails?.reason || 'registration_not_ready',
      message:
        registrationDetails?.message ||
        PUSH_DIAGNOSTIC_MESSAGES.registration_not_ready,
    }
  }
  if (!currentRegistration?.active) {
    return {
      ok: false,
      reason: 'activation_timeout',
      message: PUSH_DIAGNOSTIC_MESSAGES.activation_timeout,
    }
  }

  let currentSubscription =
    subscription ||
    (await currentRegistration.pushManager.getSubscription().catch(() => null))

  let publicKeyBytes = null
  if (ensureLocalSubscription || forceNewSubscription) {
    publicKeyBytes = urlBase64ToUint8Array(await fetchPushPublicKey())
  }

  if (currentSubscription && publicKeyBytes) {
    const subscriptionKey =
      getSubscriptionApplicationServerKey(currentSubscription)
    const keyChanged =
      subscriptionKey && !areByteArraysEqual(subscriptionKey, publicKeyBytes)

    if (forceNewSubscription || keyChanged) {
      await currentSubscription.unsubscribe().catch(() => null)
      currentSubscription = null
    }
  }

  if (!currentSubscription && ensureLocalSubscription) {
    currentSubscription = await currentRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKeyBytes,
    })
  }

  if (!currentSubscription) return { ok: false, reason: 'no_subscription' }

  await savePushSubscription(currentSubscription)
  return { ok: true, subscription: currentSubscription }
}

const showLocalTestNotification = async () => {
  if (!isPushSupported()) {
    return {
      ok: false,
      reason: 'unsupported',
      message: PUSH_DIAGNOSTIC_MESSAGES.unsupported,
    }
  }
  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      reason: 'permission_not_granted',
      message: 'Разрешение на уведомления не выдано',
    }
  }

  const registrationResult = await getPushRegistrationWithDetails()
  const registration = registrationResult?.registration || null

  if (!registrationResult?.ok || !registration?.showNotification) {
    return {
      ok: false,
      reason: registrationResult?.reason || 'registration_not_ready',
      message:
        registrationResult?.message ||
        PUSH_DIAGNOSTIC_MESSAGES.registration_not_ready,
    }
  }

  await registration.showNotification('Локальный тест push', {
    body: 'Проверка уведомления напрямую на устройстве',
    icon: '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: '/icons/notification-badge.svg',
    tag: `push-local-test-${Date.now()}`,
    data: {
      url: '/cabinet/eventsUpcoming',
      type: 'push_local_test',
    },
  })

  return { ok: true }
}

export {
  fetchPushPublicKey,
  getPushRegistration,
  getPushRegistrationWithDetails,
  isPushSupported,
  showLocalTestNotification,
  syncPushSubscription,
  urlBase64ToUint8Array,
}
