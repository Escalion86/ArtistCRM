'use client'

import { useEffect, useMemo, useState } from 'react'
import formatDateTime from '@helpers/formatDateTime'
import useSnackbar from '@helpers/useSnackbar'

const buildQuery = ({ clientId, eventId }) => {
  const params = new URLSearchParams()
  if (clientId) params.set('clientId', clientId)
  if (eventId) params.set('eventId', eventId)
  return params.toString()
}

const AvitoConversationsPanel = ({ clientId = '', eventId = '' }) => {
  const snackbar = useSnackbar()
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')

  const query = useMemo(() => buildQuery({ clientId, eventId }), [clientId, eventId])
  const selectedConversation = useMemo(
    () => conversations.find((item) => item._id === selectedId) ?? null,
    [conversations, selectedId]
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!query) return
      setLoading(true)
      try {
        const response = await fetch(`/api/integrations/avito/conversations?${query}`)
        const result = await response.json().catch(() => ({}))
        if (!active) return
        const items = Array.isArray(result?.data) ? result.data : []
        setConversations(items)
        setSelectedId((current) => current || items[0]?._id || '')
      } catch (error) {
        if (active) snackbar.error('Не удалось загрузить переписки Avito')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [query, snackbar])

  useEffect(() => {
    let active = true
    const loadMessages = async () => {
      if (!selectedId) {
        setMessages([])
        return
      }
      setMessagesLoading(true)
      try {
        const response = await fetch(
          `/api/integrations/avito/conversations/${selectedId}/messages`
        )
        const result = await response.json().catch(() => ({}))
        if (!active) return
        setMessages(Array.isArray(result?.data?.messages) ? result.data.messages : [])
      } catch (error) {
        if (active) snackbar.error('Не удалось загрузить сообщения Avito')
      } finally {
        if (active) setMessagesLoading(false)
      }
    }
    loadMessages()
    return () => {
      active = false
    }
  }, [selectedId, snackbar])

  const sendMessage = async () => {
    const nextText = text.trim()
    if (!selectedId || !nextText) return
    setSending(true)
    try {
      const response = await fetch(
        `/api/integrations/avito/conversations/${selectedId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: nextText }),
        }
      )
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.success === false) {
        snackbar.error(result?.error?.message || 'Не удалось отправить сообщение')
        if (result?.data?.message) {
          setMessages((prev) => [...prev, result.data.message])
        }
        return
      }
      if (result?.data?.message) {
        setMessages((prev) => [...prev, result.data.message])
      }
      setText('')
    } catch (error) {
      snackbar.error('Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Загрузка переписок Avito...</div>
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
        Переписок Avito пока нет.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {conversations.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {conversations.map((conversation) => (
            <button
              key={conversation._id}
              type="button"
              className={`shrink-0 cursor-pointer rounded border px-3 py-2 text-left text-xs ${
                selectedId === conversation._id
                  ? 'border-general bg-general text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              onClick={() => setSelectedId(conversation._id)}
            >
              <div className="font-semibold">
                {conversation.avitoItemTitle || 'Чат Avito'}
              </div>
              <div className="max-w-40 truncate opacity-80">
                {conversation.lastMessageText || conversation.avitoChatId}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {selectedConversation ? (
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <div className="font-semibold text-gray-800">
            {selectedConversation.avitoItemTitle || 'Чат Avito'}
          </div>
          <div>Chat ID: {selectedConversation.avitoChatId}</div>
          {selectedConversation.lastMessageAt ? (
            <div>Последнее сообщение: {formatDateTime(selectedConversation.lastMessageAt)}</div>
          ) : null}
        </div>
      ) : null}

      <div className="max-h-72 space-y-2 overflow-y-auto rounded border border-gray-200 bg-white p-2">
        {messagesLoading ? (
          <div className="text-sm text-gray-500">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-500">Сообщений пока нет.</div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${
                message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                  message.direction === 'outgoing'
                    ? 'bg-general text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.text}</div>
                <div className="mt-1 text-[10px] opacity-70">
                  {formatDateTime(message.sentAt || message.createdAt)}
                  {message.status === 'failed' ? ' · ошибка отправки' : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          className="min-h-20 w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-general"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ответить в Avito"
          maxLength={4000}
        />
        <button
          type="button"
          className="action-icon-button action-icon-button--success flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 tablet:w-auto tablet:self-end"
          onClick={sendMessage}
          disabled={sending || !selectedId || !text.trim()}
        >
          {sending ? 'Отправка...' : 'Отправить в Avito'}
        </button>
      </div>
    </div>
  )
}

export default AvitoConversationsPanel
