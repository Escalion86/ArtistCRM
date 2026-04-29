'use client'

import { useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import IconCheckBox from '@components/IconCheckBox'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { postData } from '@helpers/CRUD'
import useSnackbar from '@helpers/useSnackbar'
import {
  getPushRegistration,
  isPushSupported,
  syncPushSubscription,
} from '@helpers/pushClient'

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const PushNotificationsSettings = () => {
  const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
  const snackbar = useSnackbar()
  const [pushBusy, setPushBusy] = useState(false)
  const [pushAction, setPushAction] = useState('')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushPermission, setPushPermission] = useState('default')
  const [pushAvailable, setPushAvailable] = useState(false)
  const customSettings = siteSettings?.custom ?? {}
  const isPushEnabled =
    getCustomValue(customSettings, 'publicLeadPushEnabled') === true

  const saveCustom = useCallback(
    async (patch) => {
      await postData(
        '/api/site',
        {
          custom: {
            ...(siteSettings?.custom ?? {}),
            ...patch,
          },
        },
        (data) => setSiteSettings(data),
        null,
        false,
        null
      )
    },
    [setSiteSettings, siteSettings?.custom]
  )

  const refreshPushState = useCallback(async () => {
    const available = isPushSupported()
    setPushAvailable(available)
    setPushPermission(available ? Notification.permission : 'unsupported')
    if (!available) {
      setPushSubscribed(false)
      return
    }

    const registration = await getPushRegistration()
    if (!registration?.pushManager) {
      setPushSubscribed(false)
      return
    }

    let subscription = await registration.pushManager
      .getSubscription()
      .catch(() => null)

    if (isPushEnabled && Notification.permission === 'granted') {
      try {
        const syncResult = await syncPushSubscription({
          registration,
          subscription,
          ensureLocalSubscription: true,
        })
        if (syncResult?.ok && syncResult?.subscription) {
          subscription = syncResult.subscription
        }
      } catch (error) {
        // UI should still show local browser state if backend sync fails.
      }
    }

    setPushSubscribed(Boolean(subscription))
  }, [isPushEnabled])

  useEffect(() => {
    refreshPushState()
  }, [refreshPushState])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPushState()
    }
    const handleFocus = () => refreshPushState()

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshPushState])

  const enablePushNotifications = async () => {
    if (!isPushSupported()) {
      snackbar.warning('Push-уведомления не поддерживаются на этом устройстве')
      return
    }

    setPushBusy(true)
    setPushAction('enable')
    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      if (permission !== 'granted') {
        snackbar.warning('Разрешение на уведомления не выдано')
        return
      }

      const registration = await getPushRegistration()
      if (!registration?.pushManager) {
        snackbar.error('Service Worker не готов для push')
        return
      }

      await syncPushSubscription({
        registration,
        ensureLocalSubscription: true,
      })

      await saveCustom({ publicLeadPushEnabled: true })
      setPushSubscribed(true)
      snackbar.success('Push-уведомления включены')
    } catch (error) {
      snackbar.error(
        error?.message
          ? `Не удалось включить push-уведомления: ${error.message}`
          : 'Не удалось включить push-уведомления'
      )
    } finally {
      setPushBusy(false)
      setPushAction('')
      refreshPushState()
    }
  }

  const disablePushNotifications = async () => {
    setPushBusy(true)
    setPushAction('disable')
    try {
      const registration = await getPushRegistration()
      const subscription = await registration?.pushManager
        ?.getSubscription()
        .catch(() => null)

      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })
        await subscription.unsubscribe().catch(() => null)
      }

      await saveCustom({ publicLeadPushEnabled: false })
      setPushSubscribed(false)
      snackbar.success('Push-уведомления отключены')
    } catch (error) {
      snackbar.error('Не удалось отключить push-уведомления')
    } finally {
      setPushBusy(false)
      setPushAction('')
      refreshPushState()
    }
  }

  const sendTestPush = async () => {
    setPushBusy(true)
    setPushAction('test')
    try {
      if (Notification.permission === 'granted') {
        await syncPushSubscription({ ensureLocalSubscription: true })
      }

      let response = await fetch('/api/push/test', { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      const hasDeliveryErrors =
        Number(payload?.data?.failed || 0) > 0 ||
        Number(payload?.data?.deactivated || 0) > 0

      if (hasDeliveryErrors) {
        await syncPushSubscription({
          ensureLocalSubscription: true,
          forceNewSubscription: true,
        })
        response = await fetch('/api/push/test', { method: 'POST' })
        const retryPayload = await response.json().catch(() => ({}))
        if (response.ok && retryPayload?.success) {
          snackbar.success(
            `Подписка обновлена, тест отправлен: ${Number(
              retryPayload?.data?.sent || 0
            )}`
          )
          return
        }
      }

      if (!response.ok || !payload?.success) {
        snackbar.error(payload?.error || 'Не удалось отправить тест')
        return
      }

      const sent = Number(payload?.data?.sent || 0)
      if (sent <= 0) {
        snackbar.warning('Тест отправлен, но активных подписок не найдено')
        return
      }
      snackbar.success(`Тест отправлен: ${sent}`)
    } catch (error) {
      snackbar.error('Не удалось отправить тест push')
    } finally {
      setPushBusy(false)
      setPushAction('')
      refreshPushState()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-gray-600">
        Push-уведомления приходят в установленное PWA-приложение по новым
        входящим API-заявкам и системным напоминаниям.
      </div>
      <IconCheckBox
        label="Получать push-уведомления по новым API-заявкам"
        checked={isPushEnabled}
        onClick={() => {
          if (!pushAvailable || pushBusy) return
          if (isPushEnabled) disablePushNotifications()
          else enablePushNotifications()
        }}
        noMargin
      />
      <div className="text-xs text-gray-500">
        Статус: {pushAvailable ? 'поддерживается' : 'не поддерживается'} |
        Разрешение: {pushPermission} | Подписка:{' '}
        {pushSubscribed ? 'активна' : 'нет'}
      </div>
      <div className="flex items-center">
        <span
          className={`inline-flex min-w-[110px] items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${
            isPushEnabled
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gray-300 bg-gray-100 text-gray-700'
          }`}
        >
          {isPushEnabled ? 'Подключено' : 'Отключено'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`action-icon-button flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto ${
            isPushEnabled
              ? 'action-icon-button--danger'
              : 'action-icon-button--success'
          }`}
          onClick={() => {
            if (!pushAvailable || pushBusy) return
            if (isPushEnabled) disablePushNotifications()
            else enablePushNotifications()
          }}
          disabled={pushBusy || !pushAvailable}
        >
          {pushBusy && pushAction === 'enable'
            ? 'Подключаем...'
            : pushBusy && pushAction === 'disable'
              ? 'Отключаем...'
              : isPushEnabled
                ? 'Отключить push'
                : 'Включить push'}
        </button>
        <button
          type="button"
          className="action-icon-button action-icon-button--warning flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
          onClick={sendTestPush}
          disabled={pushBusy || !pushAvailable}
        >
          {pushBusy && pushAction === 'test' ? 'Отправка...' : 'Тест push'}
        </button>
      </div>
    </div>
  )
}

export default PushNotificationsSettings
