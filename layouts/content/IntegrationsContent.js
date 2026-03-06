'use client'

import { useEffect, useMemo, useState } from 'react'
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

  const customSettings = siteSettings?.custom ?? {}
  const apiKey = getCustomValue(customSettings, 'publicLeadApiKey') ?? ''
  const isEnabled = getCustomValue(customSettings, 'publicLeadEnabled') === true
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
      </SectionCard>
    </div>
  )
}

export default IntegrationsContent
