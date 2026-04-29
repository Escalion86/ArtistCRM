'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { faCopy, faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons'
import Input from '@components/Input'
import IconCheckBox from '@components/IconCheckBox'
import IconActionButton from '@components/IconActionButton'
import LabeledContainer from '@components/LabeledContainer'
import GoogleCalendarSettings from '@components/GoogleCalendarSettings'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { modalsFuncAtom } from '@state/atoms'
import { postData } from '@helpers/CRUD'
import useSnackbar from '@helpers/useSnackbar'
import ReactMarkdown from 'react-markdown'

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const generateApiKey = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `lead_${crypto.randomUUID().replace(/-/g, '')}`
  }
  return `lead_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

const generateApiKeyId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `key_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

const normalizePublicLeadApiKeys = (customSettings) => {
  const list = getCustomValue(customSettings, 'publicLeadApiKeys')
  const keys = Array.isArray(list)
    ? list
        .map((item) => ({
          id: String(item?.id || generateApiKeyId()),
          name: String(item?.name || '').trim() || 'Источник API',
          key: String(item?.key || '').trim(),
          enabled: item?.enabled !== false,
        }))
        .filter((item) => item.key)
    : []

  const legacyKey = String(
    getCustomValue(customSettings, 'publicLeadApiKey') || ''
  ).trim()
  if (legacyKey && !keys.some((item) => item.key === legacyKey)) {
    keys.unshift({
      id: 'legacy',
      name: 'Основной API',
      key: legacyKey,
      enabled: true,
    })
  }

  return keys
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
            <h1
              className="mb-3 text-xl font-semibold text-gray-900"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="mt-4 mb-2 text-lg font-semibold text-gray-900"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="mt-3 mb-2 text-base font-semibold text-gray-900"
              {...props}
            />
          ),
          p: ({ ...props }) => <p className="mb-2" {...props} />,
          ul: ({ ...props }) => (
            <ul className="mb-2 list-disc pl-5" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="mb-2 list-decimal pl-5" {...props} />
          ),
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

const ApiKeyEditorModal = ({
  closeModal,
  setOnConfirmFunc,
  setConfirmButtonName,
  setDisableConfirm,
  initialApiKey,
  onSave,
}) => {
  const snackbar = useSnackbar()
  const [name, setName] = useState(initialApiKey?.name ?? '')
  const [key, setKey] = useState(initialApiKey?.key ?? generateApiKey())
  const [enabled, setEnabled] = useState(initialApiKey?.enabled !== false)
  const trimmedName = name.trim()

  useEffect(() => {
    setConfirmButtonName(initialApiKey?.id ? 'Сохранить' : 'Создать ключ')
  }, [initialApiKey?.id, setConfirmButtonName])

  useEffect(() => {
    setDisableConfirm(!trimmedName || !key)
  }, [key, setDisableConfirm, trimmedName])

  useEffect(() => {
    setOnConfirmFunc(async () => {
      if (!trimmedName || !key) return
      await onSave({
        id: initialApiKey?.id || generateApiKeyId(),
        name: trimmedName,
        key,
        enabled,
      })
      closeModal()
    })
  }, [
    closeModal,
    enabled,
    initialApiKey?.id,
    key,
    onSave,
    setOnConfirmFunc,
    trimmedName,
  ])

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Название источника"
        value={name}
        onChange={setName}
        noMargin
        fullWidth
      />
      <div className="flex items-start gap-2">
        <Input
          label="API key"
          value={key}
          onChange={() => {}}
          disabled
          noMargin
          fullWidth
        />
        <IconActionButton
          icon={faCopy}
          size="md"
          variant="success"
          title="Скопировать ключ"
          className="shrink-0"
          onClick={async () => {
            if (!key || !navigator?.clipboard) {
              snackbar.warning('Не удалось скопировать ключ')
              return
            }
            try {
              await navigator.clipboard.writeText(key)
              snackbar.success('Ключ скопирован')
            } catch (error) {
              snackbar.error('Не удалось скопировать ключ')
            }
          }}
        />
      </div>
      <IconCheckBox
        label="Ключ активен"
        checked={enabled}
        onClick={() => setEnabled((value) => !value)}
        noMargin
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="action-icon-button action-icon-button--warning tablet:w-auto flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold"
          onClick={() => setKey(generateApiKey())}
        >
          Перегенерировать
        </button>
      </div>
    </div>
  )
}

const IntegrationsContent = () => {
  const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [isSaving, setIsSaving] = useState(false)

  const customSettings = useMemo(
    () => siteSettings?.custom ?? {},
    [siteSettings?.custom]
  )
  const apiKeys = useMemo(
    () => normalizePublicLeadApiKeys(customSettings),
    [customSettings]
  )
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

  const saveApiKeys = (nextApiKeys) => {
    const normalized = nextApiKeys.map((item) => ({
      id: item.id || generateApiKeyId(),
      name: String(item.name || '').trim() || 'Источник API',
      key: item.key,
      enabled: item.enabled !== false,
    }))
    return saveCustom({
      publicLeadApiKeys: normalized,
      publicLeadApiKey: normalized[0]?.key ?? '',
    })
  }

  const upsertApiKey = (apiKey) => {
    const exists = apiKeys.some((item) => item.id === apiKey.id)
    const nextApiKeys = exists
      ? apiKeys.map((item) => (item.id === apiKey.id ? apiKey : item))
      : [...apiKeys, apiKey]
    return saveApiKeys(nextApiKeys)
  }

  const openApiKeyEditor = (apiKey = null) => {
    modalsFunc.add({
      title: apiKey ? 'Редактирование API-ключа' : 'Новый API-ключ',
      Children: (props) => (
        <ApiKeyEditorModal
          {...props}
          initialApiKey={
            apiKey || {
              id: '',
              name: `Источник ${apiKeys.length + 1}`,
              key: generateApiKey(),
              enabled: true,
            }
          }
          onSave={upsertApiKey}
        />
      ),
    })
  }

  const deleteApiKey = (apiKey) => {
    modalsFunc.add({
      title: 'Удаление API-ключа',
      text: `Удалить ключ "${apiKey.name}"? Интеграции, которые используют этот ключ, перестанут отправлять заявки.`,
      confirmButtonName: 'Удалить',
      onConfirm: () =>
        saveApiKeys(apiKeys.filter((item) => item.id !== apiKey.id)),
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <LabeledContainer label="Google Calendar" noMargin>
          <GoogleCalendarSettings redirectPath="/cabinet/integrations" />
        </LabeledContainer>

        <LabeledContainer label="Интеграция входящих заявок API" noMargin>
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-600">
              Создайте отдельный ключ для каждого источника заявок. Название
              ключа будет показано на карточке заявки/мероприятия
            </div>

            <IconCheckBox
              label="Принимать заявки через API"
              checked={isEnabled}
              onClick={() => saveCustom({ publicLeadEnabled: !isEnabled })}
              noMargin
            />

            <Input
              label="Endpoint"
              value={endpointUrl}
              onChange={() => {}}
              disabled
              noMargin
              fullWidth
            />

            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-2">
              {apiKeys.length === 0 ? (
                <div className="tablet:col-span-2 rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  Ключей пока нет. Создайте первый ключ для сайта, Tilda или
                  другого источника заявок.
                </div>
              ) : (
                apiKeys.map((item) => (
                  <div
                    key={item.id}
                    className="flex w-full justify-between gap-2 rounded border border-gray-200 bg-white p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {item.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.key
                          ? `...${item.key.slice(-8)}`
                          : 'Ключ не задан'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          item.enabled
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-gray-300 bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.enabled ? 'Активен' : 'Отключен'}
                      </span>
                      <div className="flex shrink-0 justify-end gap-2">
                        <IconActionButton
                          icon={faPencilAlt}
                          size="sm"
                          variant="warning"
                          title="Настроить ключ"
                          onClick={() => openApiKeyEditor(item)}
                        />
                        <IconActionButton
                          icon={faTrash}
                          size="sm"
                          variant="danger"
                          title="Удалить ключ"
                          onClick={() => deleteApiKey(item)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="action-icon-button action-icon-button--success tablet:w-auto flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold"
                onClick={() => openApiKeyEditor()}
                disabled={isSaving}
              >
                Добавить ключ
              </button>
              <button
                type="button"
                className="action-icon-button action-icon-button--warning tablet:w-auto flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold"
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
      </div>
    </div>
  )
}

export default IntegrationsContent
