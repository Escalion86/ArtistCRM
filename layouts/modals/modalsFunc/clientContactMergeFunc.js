import { useCallback, useEffect, useMemo, useState } from 'react'
import formatDateTime from '@helpers/formatDateTime'
import getPersonFullName from '@helpers/getPersonFullName'
import useSnackbar from '@helpers/useSnackbar'
import { useClientQuery, useClientsQuery } from '@helpers/useClientsQuery'

const loadCandidates = async (clientId) => {
  const response = await fetch(`/api/clients/${clientId}/messenger/candidates`)
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.success === false) {
    throw new Error(result?.error?.message || 'Не удалось загрузить переписки')
  }
  return Array.isArray(result?.data?.conversations)
    ? result.data.conversations
    : []
}

const patchCandidate = async ({ clientId, provider, conversationId, linked }) => {
  const response = await fetch(`/api/clients/${clientId}/messenger/candidates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, conversationId, linked }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.success === false) {
    throw new Error(result?.error?.message || 'Не удалось обновить связь')
  }
  return Array.isArray(result?.data?.conversations)
    ? result.data.conversations
    : []
}

const linkVkById = async ({ clientId, vk }) => {
  const response = await fetch(`/api/clients/${clientId}/messenger/vk-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vk }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.success === false) {
    throw new Error(result?.error?.message || 'Не удалось привязать VK')
  }
  return result?.data?.conversation ?? null
}

const FILTER_PROVIDERS = [
  { value: 'all', label: 'Все' },
  { value: 'avito', label: 'Avito' },
  { value: 'vk', label: 'VK' },
]

const FILTER_STATUSES = [
  { value: 'all', label: 'Все' },
  { value: 'linked', label: 'Связанные' },
  { value: 'available', label: 'Непривязанные' },
]

const clientContactMergeFunc = (clientId) => {
  const ClientContactMergeModal = () => {
    const snackbar = useSnackbar()
    const { data: clients = [] } = useClientsQuery()
    const initialClient = useMemo(
      () => clients.find((item) => item._id === clientId) ?? null,
      [clients]
    )
    const { data: client = initialClient } = useClientQuery(
      clientId,
      initialClient
    )
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(false)
    const [updatingKey, setUpdatingKey] = useState('')
    const [search, setSearch] = useState('')
    const [vkInput, setVkInput] = useState(client?.vk || '')
    const [vkLinking, setVkLinking] = useState(false)
    const [providerFilter, setProviderFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [vkInputInitialized, setVkInputInitialized] = useState(false)

    const load = useCallback(
      async ({ showSuccess = false } = {}) => {
        if (!clientId) return
        setLoading(true)
        try {
          setConversations(await loadCandidates(clientId))
          if (showSuccess) snackbar.success('Переписки обновлены')
        } catch (error) {
          snackbar.error(error?.message || 'Не удалось загрузить переписки')
        } finally {
          setLoading(false)
        }
      },
      [snackbar]
    )

    useEffect(() => {
      load()
    }, [load])

    useEffect(() => {
      if (vkInputInitialized || !client?.vk) return
      setVkInput(client.vk)
      setVkInputInitialized(true)
    }, [client?.vk, vkInputInitialized])

    const filteredConversations = useMemo(() => {
      const query = search.trim().toLowerCase()
      return conversations.filter((item) => {
        if (providerFilter !== 'all' && item.provider !== providerFilter) {
          return false
        }
        if (
          statusFilter === 'linked' &&
          !item.linkedToCurrentClient
        ) {
          return false
        }
        if (
          statusFilter === 'available' &&
          item.linkedToCurrentClient
        ) {
          return false
        }
        if (!query) return true

        return [
          item.providerLabel,
          item.title,
          item.subtitle,
          item.externalId,
          item.lastMessageText,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
    }, [conversations, providerFilter, search, statusFilter])

    const linkedConversations = filteredConversations.filter(
      (item) => item.linkedToCurrentClient
    )
    const availableConversations = filteredConversations.filter(
      (item) => !item.linkedToCurrentClient
    )
    const linkedCount = conversations.filter(
      (item) => item.linkedToCurrentClient
    ).length
    const availableCount = conversations.length - linkedCount

    const toggleConversation = async (conversation, linked) => {
      const key = `${conversation.provider}:${conversation._id}`
      setUpdatingKey(key)
      try {
        const next = await patchCandidate({
          clientId,
          provider: conversation.provider,
          conversationId: conversation._id,
          linked,
        })
        setConversations(next)
        snackbar.success(linked ? 'Переписка привязана' : 'Переписка отвязана')
      } catch (error) {
        snackbar.error(error?.message || 'Не удалось обновить связь')
      } finally {
        setUpdatingKey('')
      }
    }

    const handleVkLink = async () => {
      const value = vkInput.trim()
      if (!value) {
        snackbar.error('Укажите VK ID, короткое имя или ссылку')
        return
      }

      setVkLinking(true)
      try {
        const linkedConversation = await linkVkById({ clientId, vk: value })
        const nextConversations = await loadCandidates(clientId)
        setConversations(nextConversations)
        setProviderFilter('vk')
        setStatusFilter('linked')
        if (linkedConversation?.externalId) {
          setSearch(linkedConversation.externalId)
        }
        snackbar.success('VK-диалог привязан')
      } catch (error) {
        snackbar.error(error?.message || 'Не удалось привязать VK')
      } finally {
        setVkLinking(false)
      }
    }

    const renderConversation = (conversation, linked) => {
      const key = `${conversation.provider}:${conversation._id}`
      return (
        <div
          key={key}
          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 tablet:flex-row tablet:items-center tablet:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                {conversation.providerLabel}
              </span>
              <span className="truncate font-semibold text-gray-900">
                {conversation.title}
              </span>
            </div>
            {conversation.subtitle && (
              <div className="mt-1 line-clamp-2 text-sm text-gray-600">
                {conversation.subtitle}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-500">
              {[conversation.externalId, formatDateTime(conversation.lastMessageAt)]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <button
            type="button"
            className={`h-10 shrink-0 cursor-pointer rounded px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              linked
                ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                : 'action-icon-button action-icon-button--success'
            }`}
            onClick={() => toggleConversation(conversation, !linked)}
            disabled={updatingKey === key}
          >
            {updatingKey === key
              ? 'Сохранение...'
              : linked
                ? 'Отвязать'
                : 'Привязать'}
          </button>
        </div>
      )
    }

    const clientName = getPersonFullName(client, { fallback: 'Клиент' })

    return (
      <div className="flex flex-col gap-3 text-sm text-gray-800">
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="font-semibold text-gray-900">{clientName}</div>
          <div className="mt-1 text-xs text-gray-600">
            Привяжите внешние диалоги к этому клиенту. После привязки они
            попадут в общий чат клиента.
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => load({ showSuccess: true })}
            disabled={loading}
          >
            {loading ? 'Обновление...' : 'Обновить'}
          </button>
        </div>

        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Привязать VK по ID
          </label>
          <div className="mt-2 flex flex-col gap-2 tablet:flex-row">
            <input
              type="text"
              className="min-h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-general"
              value={vkInput}
              onChange={(event) => setVkInput(event.target.value)}
              placeholder="id123456, 123456, vk.com/id123456 или screen_name"
              disabled={vkLinking}
            />
            <button
              type="button"
              className="h-10 shrink-0 cursor-pointer rounded bg-general px-3 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              onClick={handleVkLink}
              disabled={vkLinking}
            >
              {vkLinking ? 'Привязка...' : 'Привязать VK'}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Для отправки ответа VK должен разрешать сообщения от группы.
          </div>
        </div>

        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Поиск диалога
          </label>
          <input
            type="search"
            className="mt-2 min-h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-general"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Имя, текст сообщения, ID чата"
          />
          <div className="mt-3 flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTER_PROVIDERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`cursor-pointer rounded border px-3 py-2 text-xs font-semibold transition ${
                    providerFilter === item.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setProviderFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_STATUSES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`cursor-pointer rounded border px-3 py-2 text-xs font-semibold transition ${
                    statusFilter === item.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Найдено: {filteredConversations.length} · Связаны: {linkedCount} ·
            Непривязаны: {availableCount}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Уже связаны
          </div>
          <div className="flex flex-col gap-2">
            {linkedConversations.length > 0 ? (
              linkedConversations.map((item) => renderConversation(item, true))
            ) : (
              <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Связанных диалогов пока нет.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Можно привязать
          </div>
          <div className="flex flex-col gap-2">
            {availableConversations.length > 0 ? (
              availableConversations.map((item) => renderConversation(item, false))
            ) : (
              <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Непривязанных диалогов Avito/VK не найдено.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return {
    title: 'Объединение контактов',
    confirmButtonName: 'Закрыть',
    showDecline: false,
    onConfirm: true,
    Children: ClientContactMergeModal,
  }
}

export default clientContactMergeFunc
