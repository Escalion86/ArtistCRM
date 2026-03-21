'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import HeaderActions from '@components/HeaderActions'
import Input from '@components/Input'
import IconCheckBox from '@components/IconCheckBox'
import SectionCard from '@components/SectionCard'
import LabeledContainer from '@components/LabeledContainer'
import GoogleCalendarSettings from '@components/GoogleCalendarSettings'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { modalsFuncAtom } from '@state/atoms'
import { postData } from '@helpers/CRUD'
import ReactMarkdown from 'react-markdown'

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const generateApiKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `lead_${crypto.randomUUID().replace(/-/g, '')}`
  }
  return `lead_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const IntegrationsApiGuide = () => {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/public/docs/public-leads-api')
        if (!response.ok) throw new Error(String(response.status))
        const text = await response.text()
        if (!active) return
        setContent(text)
      } catch (loadError) {
        if (!active) return
        setError('Не удалось загрузить инструкцию API')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <div className="text-sm text-gray-600">Загрузка...</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>

  return (
    <div className="h-full overflow-y-auto text-sm leading-6 text-gray-800">
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1 className="mb-3 text-xl font-semibold text-gray-900" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mt-4 mb-2 text-lg font-semibold text-gray-900" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mt-3 mb-2 text-base font-semibold text-gray-900" {...props} />
          ),
          p: ({ ...props }) => <p className="mb-2" {...props} />,
          ul: ({ ...props }) => <ul className="mb-2 list-disc pl-5" {...props} />,
          ol: ({ ...props }) => <ol className="mb-2 list-decimal pl-5" {...props} />,
          li: ({ ...props }) => <li className="mb-1" {...props} />,
          code: ({ className, children, ...props }) =>
            className ? (
              <code
                className={`block overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100 ${className}`}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-900"
                {...props}
              >
                {children}
              </code>
            ),
          pre: ({ ...props }) => <pre className="mb-3" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

const IntegrationsContent = () => {
  const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [isSaving, setIsSaving] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushPermission, setPushPermission] = useState('default')
  const [pushStatusText, setPushStatusText] = useState('')
  const [pushAvailable, setPushAvailable] = useState(false)

  const customSettings = siteSettings?.custom ?? {}
  const apiKey = getCustomValue(customSettings, 'publicLeadApiKey') ?? ''
  const isEnabled = getCustomValue(customSettings, 'publicLeadEnabled') === true
  const isPushEnabled =
    getCustomValue(customSettings, 'publicLeadPushEnabled') === true
  const endpointUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/api/public/lead'
    return `${window.location.origin}/api/public/lead`
  }, [])

  const saveCustom = async (patch) => {
    setIsSaving(true)
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
    setIsSaving(false)
  }

  const getRegistration = useCallback(async () => {
    if (!isPushSupported()) return null
    const existing = await navigator.serviceWorker.getRegistration()
    if (existing) return existing
    return navigator.serviceWorker.register('/sw.js').catch(() => null)
  }, [])

  const refreshPushState = useCallback(async () => {
    const available = isPushSupported()
    setPushAvailable(available)
    setPushPermission(available ? Notification.permission : 'unsupported')
    if (!available) {
      setPushSubscribed(false)
      return
    }

    const registration = await getRegistration()
    if (!registration?.pushManager) {
      setPushSubscribed(false)
      return
    }

    const subscription = await registration.pushManager
      .getSubscription()
      .catch(() => null)
    setPushSubscribed(Boolean(subscription))
  }, [getRegistration])

  useEffect(() => {
    refreshPushState()
  }, [refreshPushState])

  const enablePushNotifications = async () => {
    if (!isPushSupported()) {
      setPushStatusText('Push-уведомления не поддерживаются на этом устройстве')
      return
    }

    setPushBusy(true)
    setPushStatusText('')
    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      if (permission !== 'granted') {
        setPushStatusText('Разрешение на уведомления не выдано')
        return
      }

      const keyResponse = await fetch('/api/push/public-key')
      const keyPayload = await keyResponse.json().catch(() => ({}))
      if (!keyResponse.ok || !keyPayload?.data?.publicKey) {
        setPushStatusText(keyPayload?.error || 'Не удалось получить VAPID ключ')
        return
      }

      const registration = await getRegistration()
      if (!registration?.pushManager) {
        setPushStatusText('Service Worker не готов для push')
        return
      }

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyPayload.data.publicKey),
        })
      }

      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      if (!saveResponse.ok) {
        const savePayload = await saveResponse.json().catch(() => ({}))
        setPushStatusText(
          savePayload?.error || 'Не удалось сохранить push-подписку'
        )
        return
      }

      await saveCustom({ publicLeadPushEnabled: true })
      setPushSubscribed(true)
      setPushStatusText('Push-уведомления включены')
    } catch (error) {
      setPushStatusText('Не удалось включить push-уведомления')
    } finally {
      setPushBusy(false)
      refreshPushState()
    }
  }

  const disablePushNotifications = async () => {
    setPushBusy(true)
    setPushStatusText('')
    try {
      const registration = await getRegistration()
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
      setPushStatusText('Push-уведомления отключены')
    } catch (error) {
      setPushStatusText('Не удалось отключить push-уведомления')
    } finally {
      setPushBusy(false)
      refreshPushState()
    }
  }

  const sendTestPush = async () => {
    setPushBusy(true)
    setPushStatusText('')
    try {
      const response = await fetch('/api/push/test', { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.success) {
        setPushStatusText(payload?.error || 'Не удалось отправить тест')
        return
      }

      const sent = Number(payload?.data?.sent || 0)
      if (sent <= 0) {
        setPushStatusText('Тест отправлен, но активных подписок не найдено')
        return
      }
      setPushStatusText(`Тест отправлен: ${sent}`)
    } catch (error) {
      setPushStatusText('Не удалось отправить тест push')
    } finally {
      setPushBusy(false)
      refreshPushState()
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions left={<div />} right={<div />} />
      </ContentHeader>

      <SectionCard className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <LabeledContainer label="Google Calendar" noMargin>
          <GoogleCalendarSettings redirectPath="/cabinet/integrations" />
        </LabeledContainer>

        <LabeledContainer label="Интеграция входящих заявок API" noMargin>
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-600">
              Используйте этот API key для отправки лидов в CRM через endpoint
              ` /api/public/lead`.
            </div>

            <IconCheckBox
              label="Принимать заявки через API"
              checked={isEnabled}
              onClick={() => saveCustom({ publicLeadEnabled: !isEnabled })}
              noMargin
            />

            <Input
              label="API key для входящих заявок"
              value={apiKey}
              onChange={() => {}}
              disabled
              noMargin
              fullWidth
            />

            <Input
              label="Endpoint"
              value={endpointUrl}
              onChange={() => {}}
              disabled
              noMargin
              fullWidth
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="action-icon-button action-icon-button--warning flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
                onClick={() => saveCustom({ publicLeadApiKey: generateApiKey() })}
                disabled={isSaving}
              >
                Сгенерировать ключ
              </button>
              <button
                type="button"
                className="action-icon-button action-icon-button--success flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
                onClick={() => {
                  if (!apiKey || !navigator?.clipboard) return
                  navigator.clipboard.writeText(apiKey)
                }}
                disabled={!apiKey}
              >
                Копировать ключ
              </button>
              <button
                type="button"
                className="action-icon-button action-icon-button--warning flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
                onClick={() =>
                  modalsFunc.add({
                    title: 'Инструкция API',
                    showDecline: true,
                    declineButtonName: 'Закрыть',
                    Children: IntegrationsApiGuide,
                  })
                }
              >
                Открыть инструкцию API
              </button>
            </div>
          </div>
        </LabeledContainer>

        <LabeledContainer label="Push-уведомления для PWA (API-заявки)" noMargin>
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-600">
              Уведомления приходят на установленное PWA-приложение при новых
              заявках из API.
            </div>
            <div className="text-xs text-gray-500">
              Статус: {pushAvailable ? 'поддерживается' : 'не поддерживается'} |
              Разрешение: {pushPermission} | Подписка:{' '}
              {pushSubscribed ? 'активна' : 'нет'}
            </div>
            <IconCheckBox
              label="Отправлять push-уведомления о новых API-заявках"
              checked={isPushEnabled}
              onClick={() => {
                if (!pushAvailable || pushBusy) return
                if (isPushEnabled) disablePushNotifications()
                else enablePushNotifications()
              }}
              noMargin
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="action-icon-button action-icon-button--success flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
                onClick={enablePushNotifications}
                disabled={pushBusy || !pushAvailable}
              >
                Включить push
              </button>
              <button
                type="button"
                className="action-icon-button action-icon-button--danger flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
                onClick={disablePushNotifications}
                disabled={pushBusy || !pushAvailable}
              >
                Отключить push
              </button>
              <button
                type="button"
                className="action-icon-button action-icon-button--warning flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
                onClick={sendTestPush}
                disabled={pushBusy || !pushAvailable}
              >
                Тест push
              </button>
            </div>
            {pushStatusText ? (
              <div className="text-sm text-gray-700">{pushStatusText}</div>
            ) : null}
          </div>
        </LabeledContainer>
      </SectionCard>
    </div>
  )
}

export default IntegrationsContent
