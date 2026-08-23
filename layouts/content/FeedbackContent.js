'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { useRouter, useSearchParams } from 'next/navigation'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import Notice from '@components/Notice'
import SupportAttachmentPicker from '@components/SupportAttachmentPicker'
import {
  useSupportTicketMutations,
  useSupportTicketQuery,
  useSupportTicketsQuery,
} from '@helpers/useSupportTickets'

const SupportTicketComposer = dynamic(() => import('@components/SupportTicketComposer'))

const CATEGORY_LABELS = { bug: 'Ошибка', idea: 'Идея', question: 'Вопрос' }
const STATUS_LABELS = { open: 'Открыт', in_progress: 'В работе', resolved: 'Решён' }

const formatDate = (value) => value ? new Date(value).toLocaleString('ru-RU') : ''

const TicketDetail = ({ ticketId, developer, onClose }) => {
  const query = useSupportTicketQuery(ticketId)
  const { replyMutation, statusMutation, readMutation } = useSupportTicketMutations()
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const pages = useMemo(() => query.data?.pages || [], [query.data?.pages])
  const ticket = pages[0]?.data?.ticket
  const messages = useMemo(
    () => [...pages].reverse().flatMap((page) => page?.data?.messages || []),
    [pages]
  )

  useEffect(() => {
    if (ticket?.unread) readMutation.mutate(ticketId)
    // mutate intentionally omitted: only ticket unread state should trigger this action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.unread, ticketId])

  const sendReply = async (event) => {
    event.preventDefault()
    setError('')
    if (!message.trim()) return setError('Введите сообщение')
    const formData = new FormData()
    formData.append('message', message.trim())
    files.forEach((file) => formData.append('files', file))
    try {
      await replyMutation.mutateAsync({ ticketId, formData })
      setMessage('')
      setFiles([])
    } catch (reason) { setError(reason?.message || 'Не удалось отправить сообщение') }
  }

  if (query.isLoading) return <div className="p-4 text-gray-500">Загружаем диалог…</div>
  if (query.error || !ticket) return <Notice tone="error">{query.error?.message || 'Тикет не найден'}</Notice>

  return (
    <section className="support-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
      <header className="flex flex-wrap items-start gap-3 border-b border-gray-200 p-4">
        <button type="button" onClick={onClose} className="filter-control cursor-pointer">← К списку</button>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{CATEGORY_LABELS[ticket.category]}</span><span className="text-xs text-gray-500">{STATUS_LABELS[ticket.status]}</span></div><h2 className="mt-1 break-words text-lg font-semibold">{ticket.title}</h2>{developer && ticket.createdByLabel ? <p className="text-sm text-gray-500">Автор: {ticket.createdByLabel}</p> : null}</div>
        {developer ? <select value={ticket.status} disabled={statusMutation.isPending} onChange={(event) => statusMutation.mutate({ ticketId, status: event.target.value })} className="h-10 cursor-pointer rounded-lg border border-gray-300 bg-white px-3"><option value="open">Открыт</option><option value="in_progress">В работе</option><option value="resolved">Решён</option></select> : null}
      </header>
      <div className="min-h-64 flex-1 space-y-3 overflow-y-auto p-4">
        {query.hasNextPage ? <button type="button" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="filter-control mx-auto flex cursor-pointer">{query.isFetchingNextPage ? 'Загружаем…' : 'Показать ранние сообщения'}</button> : null}
        {messages.map((item) => {
          const ownSide = developer ? item.authorRole === 'developer' : item.authorRole === 'user'
          return <article key={item.id} className={`flex ${ownSide ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] rounded-xl border p-3 sm:max-w-[75%] ${ownSide ? 'support-message-own' : 'support-message-other'}`}><div className="mb-1 flex flex-wrap gap-2 text-xs text-gray-500"><span>{item.authorLabel || (item.authorRole === 'developer' ? 'Разработчик' : 'Пользователь')}</span><time>{formatDate(item.createdAt)}</time></div><p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>{item.attachments?.length ? <div className="mt-3 flex flex-wrap gap-2">{item.attachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-300"><Image src={attachment.url} alt={attachment.name} fill sizes="96px" className="object-cover" /></a>)}</div> : null}</div></article>
        })}
      </div>
      <form onSubmit={sendReply} className="space-y-3 border-t border-gray-200 p-4">
        {error ? <Notice tone="error" role="alert">{error}</Notice> : null}
        <textarea value={message} maxLength={5000} disabled={replyMutation.isPending} onChange={(event) => setMessage(event.target.value)} className="min-h-24 w-full rounded-lg border border-gray-300 bg-white p-3" placeholder="Напишите сообщение…" />
        <SupportAttachmentPicker files={files} onChange={setFiles} disabled={replyMutation.isPending} onError={setError} />
        <button type="submit" disabled={replyMutation.isPending} className="filter-control filter-control--primary cursor-pointer disabled:opacity-50">{replyMutation.isPending ? 'Отправляем…' : 'Отправить'}</button>
      </form>
    </section>
  )
}

const FeedbackContent = () => {
  const loggedUser = useAtomValue(loggedUserAtom)
  const developer = loggedUser?.role === 'dev' && loggedUser?.impersonation?.active !== true
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketId = searchParams.get('ticketId') || ''
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const ticketsQuery = useSupportTicketsQuery({ status, category })
  const { createMutation } = useSupportTicketMutations()
  const tickets = ticketsQuery.data?.pages.flatMap((page) => page?.data || []) || []

  const openTicket = (id) => router.replace(`/cabinet/feedback?ticketId=${id}`)
  const closeTicket = () => router.replace('/cabinet/feedback')
  const createTicket = async (formData) => {
    const result = await createMutation.mutateAsync(formData)
    setCreating(false)
    openTicket(result.data.ticket.id)
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-2 sm:p-4">
      {ticketId ? <TicketDetail ticketId={ticketId} developer={developer} onClose={closeTicket} /> : creating ? <SupportTicketComposer onSubmit={createTicket} onCancel={() => setCreating(false)} loading={createMutation.isPending} /> : <>
        <div className="flex flex-wrap items-center gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="filter-control cursor-pointer"><option value="">Все статусы</option><option value="open">Открытые</option><option value="in_progress">В работе</option><option value="resolved">Решённые</option></select><select value={category} onChange={(event) => setCategory(event.target.value)} className="filter-control cursor-pointer"><option value="">Все типы</option><option value="bug">Ошибки</option><option value="idea">Идеи</option><option value="question">Вопросы</option></select>{!developer ? <button type="button" onClick={() => setCreating(true)} className="filter-control filter-control--primary ml-auto cursor-pointer">Новое обращение</button> : null}</div>
        {ticketsQuery.error ? <Notice tone="error">{ticketsQuery.error.message}</Notice> : null}
        <div className="space-y-2">{tickets.map((ticket) => <button type="button" key={ticket.id} onClick={() => openTicket(ticket.id)} className="support-surface flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left"><span className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${ticket.unread ? 'bg-danger' : 'bg-gray-300'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 text-xs text-gray-500"><span>{CATEGORY_LABELS[ticket.category]}</span><span>·</span><span>{STATUS_LABELS[ticket.status]}</span>{developer && ticket.createdByLabel ? <><span>·</span><span>{ticket.createdByLabel}</span></> : null}</div><h2 className={`mt-1 break-words ${ticket.unread ? 'font-bold' : 'font-semibold'}`}>{ticket.title}</h2><time className="mt-1 block text-xs text-gray-500">{formatDate(ticket.lastMessageAt)}</time></div><span className="text-gray-500">→</span></button>)}</div>
        {ticketsQuery.isLoading ? <p className="p-4 text-center text-gray-500">Загружаем обращения…</p> : null}
        {!ticketsQuery.isLoading && tickets.length === 0 ? <Notice tone="neutral">{developer ? 'Обращений пока нет.' : 'Вы ещё не создавали обращений.'}</Notice> : null}
        {ticketsQuery.hasNextPage ? <button type="button" onClick={() => ticketsQuery.fetchNextPage()} disabled={ticketsQuery.isFetchingNextPage} className="filter-control mx-auto cursor-pointer">{ticketsQuery.isFetchingNextPage ? 'Загружаем…' : 'Показать ещё'}</button> : null}
      </>}
    </div>
  )
}

export default FeedbackContent
