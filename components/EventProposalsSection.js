'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Notice from '@components/Notice'
import { formatMoney } from '@helpers/formatMoney'
import { sendFile } from '@helpers/cloudinary'
import { renderProposalVariables } from '@helpers/proposalContent'
import { useQueryClient } from '@tanstack/react-query'

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const dateInput = (value) => {
  const date = value ? new Date(value) : new Date(Date.now() + 7 * 86400000)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const hasPendingDeliveryFailures = (delivery) => {
  const latest = new Map()
  for (const item of Array.isArray(delivery) ? delivery : []) {
    latest.set(item.mediaId || item.type, item.status)
  }
  return [...latest.values()].some((status) => status === 'failed')
}

const EventProposalsSection = ({ eventId, onApplied }) => {
  const queryClient = useQueryClient()
  const [templates, setTemplates] = useState([])
  const [items, setItems] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [unavailable, setUnavailable] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const load = useCallback(async () => {
    if (!eventId) return
    try {
      const [templatesResponse, proposalsResponse] = await Promise.all([
        fetch('/api/proposal-templates', { cache: 'no-store' }),
        fetch(`/api/events/${eventId}/proposals`, { cache: 'no-store' }),
      ])
      const [templatesBody, proposalsBody] = await Promise.all([
        templatesResponse.json().catch(() => ({})),
        proposalsResponse.json().catch(() => ({})),
      ])
      if (
        templatesResponse.status === 403 ||
        proposalsResponse.status === 403
      ) {
        setUnavailable(true)
        return
      }
      if (!templatesResponse.ok)
        throw new Error(
          templatesBody?.error?.message || 'Не удалось загрузить шаблоны'
        )
      if (!proposalsResponse.ok)
        throw new Error(
          proposalsBody?.error?.message || 'Не удалось загрузить предложения'
        )
      const activeTemplates = (templatesBody.data || []).filter(
        (item) => item.status === 'active'
      )
      setTemplates(activeTemplates)
      setItems(proposalsBody.data || [])
      setSelectedTemplate((current) => current || activeTemplates[0]?._id || '')
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    }
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (sourceProposalId = '') => {
    if (!selectedTemplate && !sourceProposalId)
      return setMessage({
        tone: 'warning',
        text: 'Сначала создайте шаблон в разделе «Документы → Предложения»',
      })
    setBusy(true)
    try {
      const response = await fetch(`/api/events/${eventId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          sourceProposalId
            ? { sourceProposalId }
            : { templateId: selectedTemplate }
        ),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body?.success === false)
        throw new Error(
          body?.error?.message || 'Не удалось создать предложение'
        )
      setEditing({ ...body.data, validUntil: dateInput(body.data.validUntil) })
      await load()
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/proposals/${editing._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title,
          validUntil: editing.validUntil,
          messageText: editing.messageText,
          blocks: editing.blocksSnapshot,
          packages: editing.packages,
          media: editing.mediaSnapshot,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body?.success === false)
        throw new Error(body?.error?.message || 'Не удалось сохранить')
      setEditing({ ...body.data, validUntil: dateInput(body.data.validUntil) })
      setMessage({ tone: 'success', text: 'Черновик сохранён' })
      await load()
      return body.data
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
      return null
    } finally {
      setBusy(false)
    }
  }

  const action = async (proposal, name) => {
    setBusy(true)
    try {
      const response = await fetch(`/api/proposals/${proposal._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: name }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body?.success === false)
        throw new Error(body?.error?.message || 'Действие не выполнено')
      if (name === 'publish') setEditing(null)
      if (name === 'apply') {
        const appliedPackage = body.data?.packages?.find(
          (item) => item.id === body.data?.selectedPackageId
        )
        if (appliedPackage && typeof onApplied === 'function') {
          onApplied({
            contractSum: Number(appliedPackage.total) || 0,
            servicesIds: (appliedPackage.lines || [])
              .map((line) => line.serviceId)
              .filter(Boolean),
          })
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
          queryClient.invalidateQueries({ queryKey: ['events'] }),
        ])
      }
      setMessage({
        tone: 'success',
        text:
          name === 'publish'
            ? 'Предложение опубликовано'
            : name === 'revoke'
              ? 'Ссылка отозвана'
              : 'Выбранный вариант применён к заявке',
      })
      await load()
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const loadDetails = async (proposal) => {
    const response = await fetch(`/api/proposals/${proposal._id}`, {
      cache: 'no-store',
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body?.success === false)
      return setMessage({
        tone: 'error',
        text: body?.error?.message || 'Не удалось открыть предложение',
      })
    if (proposal.status === 'draft')
      setEditing({ ...body.data, validUntil: dateInput(body.data.validUntil) })
    return body.data
  }

  const updatePackage = (packageIndex, patch) =>
    setEditing((current) => ({
      ...current,
      packages: current.packages.map((item, index) =>
        index === packageIndex ? { ...item, ...patch } : item
      ),
    }))
  const updateLine = (packageIndex, lineIndex, patch) =>
    setEditing((current) => ({
      ...current,
      packages: current.packages.map((item, index) =>
        index === packageIndex
          ? {
              ...item,
              lines: item.lines.map((line, currentLineIndex) =>
                currentLineIndex === lineIndex ? { ...line, ...patch } : line
              ),
            }
          : item
      ),
    }))

  const updateBlock = (blockIndex, patch) =>
    setEditing((current) => ({
      ...current,
      blocksSnapshot: current.blocksSnapshot.map((block, index) =>
        index === blockIndex ? { ...block, ...patch } : block
      ),
    }))

  const uploadProposalMedia = async (file) => {
    if (!file || !editing) return
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(
      file.type
    )
    const isVideo = file.type === 'video/mp4'
    const limit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if ((!isImage && !isVideo) || file.size > limit) {
      setMessage({
        tone: 'error',
        text: 'Разрешены JPG, PNG, WebP до 10 МБ и MP4 до 50 МБ',
      })
      return
    }
    if ((editing.mediaSnapshot || []).length >= 10) {
      setMessage({ tone: 'error', text: 'Можно добавить не больше 10 медиа' })
      return
    }
    setBusy(true)
    const result = await sendFile(file, null, `proposals/${editing._id}`)
    const uploaded = Array.isArray(result) ? result[0] : result
    const rawUrl = uploaded?.url || uploaded?.fileUrl || ''
    const path = uploaded?.path || uploaded?.filePath || ''
    const url =
      rawUrl ||
      (path
        ? `https://cloud.escalion.ru/uploads/${String(path).replace(/^\/+/, '')}`
        : '')
    if (url) {
      setEditing((current) => ({
        ...current,
        mediaSnapshot: [
          ...(current.mediaSnapshot || []),
          {
            id: crypto.randomUUID(),
            kind: isVideo ? 'video' : 'image',
            url,
            title: file.name,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          },
        ],
      }))
    } else {
      setMessage({ tone: 'error', text: 'Не удалось загрузить файл' })
    }
    setBusy(false)
  }

  if (unavailable)
    return (
      <Notice tone="warning">
        Коммерческие предложения временно доступны только разработчику.
      </Notice>
    )

  if (editing) {
    const previewVariables = {
      proposal: { url: 'https://artistcrm.ru/proposal/…' },
      client: editing.clientSnapshot || {},
      event: editing.eventSnapshot || {},
      artist: editing.artistSnapshot || {},
    }
    const unresolved = new Set()
    const previewMessage = renderProposalVariables(
      editing.messageText || '',
      previewVariables
    )
    previewMessage.unknown.forEach((key) => unresolved.add(key))
    editing.blocksSnapshot.forEach((block) => {
      renderProposalVariables(
        `${block.title || ''}\n${block.text || ''}`,
        previewVariables
      ).unknown.forEach((key) => unresolved.add(key))
    })
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Черновик версии {editing.version}</div>
          <button
            type="button"
            className="h-8 cursor-pointer rounded border px-2 text-xs"
            onClick={() => setEditing(null)}
          >
            Закрыть
          </button>
        </div>
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        <input
          className="h-10 w-full rounded border border-gray-300 px-3 text-sm"
          value={editing.title || ''}
          onChange={(event) =>
            setEditing({ ...editing, title: event.target.value })
          }
          placeholder="Название предложения"
        />
        <label className="block text-xs font-medium text-gray-600">
          Действует до
          <input
            type="date"
            className="mt-1 h-10 w-full rounded border border-gray-300 px-3 text-sm"
            value={editing.validUntil || ''}
            onChange={(event) =>
              setEditing({ ...editing, validUntil: event.target.value })
            }
          />
        </label>
        <textarea
          className="min-h-24 w-full rounded border border-gray-300 p-3 text-sm"
          value={editing.messageText || ''}
          onChange={(event) =>
            setEditing({ ...editing, messageText: event.target.value })
          }
          placeholder="Сообщение для чата"
        />
        {unresolved.size ? (
          <Notice tone="warning">
            Заполните переменные перед публикацией: {[...unresolved].join(', ')}
          </Notice>
        ) : null}
        <details className="rounded-lg border border-gray-200 p-3">
          <summary className="cursor-pointer font-semibold">
            Тексты страницы
          </summary>
          <div className="mt-3 space-y-3">
            {editing.blocksSnapshot.map((block, blockIndex) => (
              <div key={block.id || block.type} className="rounded border p-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={block.enabled !== false}
                    onChange={(event) =>
                      updateBlock(blockIndex, { enabled: event.target.checked })
                    }
                  />
                  {block.type}
                </label>
                <input
                  className="mt-2 h-9 w-full rounded border px-2 text-sm"
                  value={block.title || ''}
                  onChange={(event) =>
                    updateBlock(blockIndex, { title: event.target.value })
                  }
                />
                {block.text !== undefined ? (
                  <textarea
                    className="mt-2 min-h-16 w-full rounded border p-2 text-sm"
                    value={block.text || ''}
                    onChange={(event) =>
                      updateBlock(blockIndex, { text: event.target.value })
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        </details>
        <div className="space-y-3">
          {editing.packages.map((item, packageIndex) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="flex gap-2">
                <input
                  className="h-9 min-w-0 flex-1 rounded border px-2 font-semibold"
                  value={item.title}
                  onChange={(event) =>
                    updatePackage(packageIndex, { title: event.target.value })
                  }
                />
                <label className="flex cursor-pointer items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={item.recommended}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        packages: current.packages.map((candidate, index) => ({
                          ...candidate,
                          recommended:
                            index === packageIndex
                              ? event.target.checked
                              : false,
                        })),
                      }))
                    }
                  />
                  Рекомендуем
                </label>
              </div>
              <textarea
                className="mt-2 min-h-16 w-full rounded border p-2 text-sm"
                value={item.description || ''}
                onChange={(event) =>
                  updatePackage(packageIndex, {
                    description: event.target.value,
                  })
                }
                placeholder="Описание варианта"
              />
              <div className="mt-2 space-y-2">
                {item.lines.map((line, lineIndex) => (
                  <div
                    key={`${line.serviceId}-${lineIndex}`}
                    className="grid grid-cols-[1fr_110px] gap-2"
                  >
                    <input
                      className="h-9 min-w-0 rounded border px-2 text-sm"
                      value={line.title}
                      onChange={(event) =>
                        updateLine(packageIndex, lineIndex, {
                          title: event.target.value,
                        })
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      className="h-9 rounded border px-2 text-sm"
                      value={line.price}
                      onChange={(event) =>
                        updateLine(packageIndex, lineIndex, {
                          price: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="h-8 cursor-pointer rounded border px-2 text-xs"
                  onClick={() =>
                    updatePackage(packageIndex, {
                      lines: [
                        ...item.lines,
                        {
                          serviceId: '',
                          title: 'Дополнительная услуга',
                          description: '',
                          price: 0,
                        },
                      ],
                    })
                  }
                >
                  + Позиция
                </button>
                <label className="text-xs font-semibold">
                  Итого{' '}
                  <input
                    type="number"
                    min="0"
                    className="ml-2 h-9 w-28 rounded border px-2"
                    value={item.total}
                    onChange={(event) =>
                      updatePackage(packageIndex, {
                        total: Number(event.target.value) || 0,
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="h-9 w-full cursor-pointer rounded border border-dashed border-gray-400 text-sm"
          onClick={() =>
            setEditing((current) => ({
              ...current,
              packages: [
                ...current.packages,
                {
                  id: crypto.randomUUID(),
                  title: `Вариант ${current.packages.length + 1}`,
                  description: '',
                  lines:
                    current.packages[0]?.lines?.map((line) => ({ ...line })) ||
                    [],
                  total: current.packages[0]?.total || 0,
                  recommended: false,
                },
              ].slice(0, 6),
            }))
          }
        >
          + Добавить вариант
        </button>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="font-semibold">
            Медиа ({editing.mediaSnapshot?.length || 0}/10)
          </div>
          <div className="mt-2 space-y-2">
            {(editing.mediaSnapshot || []).map((item, index) => (
              <div
                key={item.id || item.url}
                className="flex items-center justify-between gap-2 rounded border p-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  {item.title || item.url}
                </span>
                <button
                  type="button"
                  className="cursor-pointer text-red-600"
                  onClick={() =>
                    setEditing((current) => ({
                      ...current,
                      mediaSnapshot: current.mediaSnapshot.filter(
                        (_, mediaIndex) => mediaIndex !== index
                      ),
                    }))
                  }
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
          <div className="tablet:flex-row mt-3 flex flex-col gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              disabled={busy}
              onChange={(event) => uploadProposalMedia(event.target.files?.[0])}
            />
            <button
              type="button"
              className="h-9 cursor-pointer rounded border px-3 text-xs"
              onClick={() => {
                const url = window.prompt(
                  'Ссылка на VK Video, Rutube или YouTube'
                )
                if (url)
                  setEditing((current) => ({
                    ...current,
                    mediaSnapshot: [
                      ...(current.mediaSnapshot || []),
                      {
                        id: crypto.randomUUID(),
                        kind: 'video_link',
                        url,
                        title: 'Видео',
                      },
                    ].slice(0, 10),
                  }))
              }}
            >
              Добавить видео-ссылку
            </button>
          </div>
        </div>
        <button
          type="button"
          className="h-10 w-full cursor-pointer rounded border border-gray-400 px-3 text-sm font-semibold"
          onClick={() => setShowPreview((current) => !current)}
        >
          {showPreview ? 'Скрыть предпросмотр' : 'Предпросмотр для клиента'}
        </button>
        {showPreview ? (
          <div className="rounded-2xl border border-gray-200 bg-stone-50 p-4">
            <div className="rounded-xl bg-stone-900 p-5 text-white">
              <div className="text-xs tracking-widest text-amber-300 uppercase">
                Персональное предложение
              </div>
              <div className="mt-2 text-2xl font-semibold">{editing.title}</div>
            </div>
            <div className="mt-4 text-sm whitespace-pre-line text-gray-600">
              {previewMessage.text}
            </div>
            <div className="mt-4 space-y-3">
              {editing.packages.map((item) => (
                <div key={item.id} className="rounded-xl border bg-white p-4">
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>{item.title}</span>
                    <span>{formatMoney(item.total)}</span>
                  </div>
                  {item.description ? (
                    <div className="mt-2 text-sm text-gray-600">
                      {item.description}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            className="action-icon-button h-10 cursor-pointer rounded px-3 text-sm"
            onClick={saveDraft}
          >
            Сохранить
          </button>
          <button
            type="button"
            disabled={busy}
            className="action-icon-button action-icon-button--warning h-10 cursor-pointer rounded px-3 text-sm font-semibold"
            onClick={async () => {
              const saved = await saveDraft()
              if (saved) await action(saved, 'publish')
            }}
          >
            Опубликовать
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Notice tone="info">
        Это предложения именно для этой заявки. Выберите заготовку, нажмите
        «Создать предложение», проверьте варианты и цены, затем опубликуйте.
        После публикации появятся кнопки для копирования ссылки и отправки в
        Telegram.
      </Notice>
      {!templates.length ? (
        <Notice tone="neutral">
          Сначала создайте активный шаблон в разделе{' '}
          <Link
            className="cursor-pointer font-semibold underline"
            href="/cabinet/documents?section=proposals"
          >
            «Документы → Предложения»
          </Link>
          . Затем вернитесь в заявку.
        </Notice>
      ) : null}
      <div className="tablet:flex-row flex flex-col gap-2">
        <select
          className="h-10 min-w-0 flex-1 rounded border border-gray-300 px-3 text-sm"
          value={selectedTemplate}
          onChange={(event) => setSelectedTemplate(event.target.value)}
        >
          <option value="">Выберите шаблон</option>
          {templates.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !selectedTemplate}
          className="action-icon-button action-icon-button--warning h-10 cursor-pointer rounded px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => create()}
        >
          Создать предложение
        </button>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((proposal) => {
            const hasFailedDelivery = hasPendingDeliveryFailures(
              proposal.delivery
            )
            return (
              <div
                key={proposal._id}
                className="rounded-lg border border-gray-200 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{proposal.title}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Версия {proposal.version} ·{' '}
                      {proposal.status === 'draft'
                        ? 'черновик'
                        : proposal.status === 'published'
                          ? 'опубликовано'
                          : proposal.status === 'expired'
                            ? 'срок истёк'
                            : 'отозвано'}
                      {proposal.selectedPackageId
                        ? ' · клиент выбрал вариант'
                        : ''}
                    </div>
                  </div>
                  {proposal.selectedPackageId ? (
                    <div className="text-sm font-semibold text-emerald-700">
                      {
                        proposal.packages.find(
                          (item) => item.id === proposal.selectedPackageId
                        )?.title
                      }
                    </div>
                  ) : null}
                </div>
                <div className="tablet:grid-cols-3 mt-3 grid grid-cols-2 gap-2">
                  {proposal.status === 'draft' ? (
                    <button
                      type="button"
                      className="h-9 cursor-pointer rounded border px-2 text-xs"
                      onClick={() => loadDetails(proposal)}
                    >
                      Редактировать
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="h-9 cursor-pointer rounded border px-2 text-xs"
                        onClick={async () => {
                          const data = await loadDetails(proposal)
                          if (data?.publicUrl)
                            window.open(
                              data.publicUrl,
                              '_blank',
                              'noopener,noreferrer'
                            )
                        }}
                      >
                        Открыть
                      </button>
                      <button
                        type="button"
                        className="h-9 cursor-pointer rounded border px-2 text-xs"
                        onClick={async () => {
                          const data = await loadDetails(proposal)
                          if (data?.renderedMessage) {
                            await copyText(data.renderedMessage)
                            setMessage({
                              tone: 'success',
                              text: 'Сообщение и ссылка скопированы',
                            })
                          }
                        }}
                      >
                        Копировать
                      </button>
                      <button
                        type="button"
                        className="h-9 cursor-pointer rounded border px-2 text-xs"
                        onClick={async () => {
                          const response = await fetch(
                            `/api/proposals/${proposal._id}/send-telegram`,
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                retryFailedOnly: hasFailedDelivery,
                              }),
                            }
                          )
                          const body = await response.json().catch(() => ({}))
                          setMessage(
                            response.ok && body?.success !== false
                              ? {
                                  tone: 'success',
                                  text: 'Предложение отправлено в Telegram',
                                }
                              : {
                                  tone: 'error',
                                  text:
                                    body?.error?.message ||
                                    'Не удалось отправить',
                                }
                          )
                          load()
                        }}
                      >
                        {hasFailedDelivery ? 'Повторить ошибки' : 'В Telegram'}
                      </button>
                      {proposal.selectedPackageId && !proposal.appliedAt ? (
                        <button
                          type="button"
                          className="h-9 cursor-pointer rounded border border-emerald-300 px-2 text-xs text-emerald-700"
                          onClick={() => action(proposal, 'apply')}
                        >
                          Применить
                        </button>
                      ) : null}
                      {proposal.status === 'published' ? (
                        <button
                          type="button"
                          className="h-9 cursor-pointer rounded border border-red-200 px-2 text-xs text-red-700"
                          onClick={() => action(proposal, 'revoke')}
                        >
                          Отозвать
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="h-9 cursor-pointer rounded border px-2 text-xs"
                        onClick={() => create(proposal._id)}
                      >
                        Новая версия
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          Предложений по этой заявке ещё нет
        </div>
      )}
    </div>
  )
}

export default EventProposalsSection
