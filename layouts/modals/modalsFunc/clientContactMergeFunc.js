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

    const linkedConversations = conversations.filter(
      (item) => item.linkedToCurrentClient
    )
    const availableConversations = conversations.filter(
      (item) => !item.linkedToCurrentClient
    )

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
