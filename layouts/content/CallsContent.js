'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import {
  faPhone,
  faPlus,
  faUserPlus,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import AppButton from '@components/AppButton'
import Input from '@components/Input'
import Textarea from '@components/Textarea'
import { modalsFuncAtom } from '@state/atoms'
import { useCallActions, useCallsQuery } from '@helpers/useCallsQuery'
import { useClientActions, useClientsQuery } from '@helpers/useClientsQuery'
import getPersonFullName from '@helpers/getPersonFullName'
import useSnackbar from '@helpers/useSnackbar'

const STATUS_LABELS = {
  new: 'Новый',
  processing: 'Обработка',
  ready: 'Готов',
  linked: 'Связан',
  ignored: 'Не клиент',
  failed: 'Ошибка',
}

const DIRECTION_LABELS = {
  incoming: 'Входящий',
  outgoing: 'Исходящий',
  unknown: 'Неизвестно',
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'ready', label: 'Готовые' },
  { value: 'linked', label: 'Связанные' },
  { value: 'ignored', label: 'Не клиенты' },
  { value: 'failed', label: 'Ошибки' },
]

const formatDateTime = (value) => {
  if (!value) return 'Дата не указана'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата не указана'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toDatetimeLocal = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const fromDatetimeLocal = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const splitClientName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    secondName: parts.slice(1).join(' '),
  }
}

const getClientLabel = (client) => {
  if (!client) return ''
  return (
    getPersonFullName(client) ||
    client.phone ||
    client.whatsapp ||
    `Клиент ${client._id}`
  )
}

const CallEditorModal = ({
  closeModal,
  setOnConfirmFunc,
  setConfirmButtonName,
  setDisableConfirm,
  initialCall = null,
  onSave,
}) => {
  const [phone, setPhone] = useState(initialCall?.phone ?? null)
  const [direction, setDirection] = useState(
    initialCall?.direction ?? 'incoming'
  )
  const [startedAt, setStartedAt] = useState(
    toDatetimeLocal(initialCall?.startedAt)
  )
  const [durationSec, setDurationSec] = useState(
    initialCall?.durationSec ?? 0
  )
  const [transcript, setTranscript] = useState(initialCall?.transcript ?? '')

  useEffect(() => {
    setConfirmButtonName(initialCall?._id ? 'Сохранить' : 'Добавить звонок')
  }, [initialCall?._id, setConfirmButtonName])

  useEffect(() => {
    setDisableConfirm(!phone && !transcript.trim())
  }, [phone, setDisableConfirm, transcript])

  useEffect(() => {
    setOnConfirmFunc(async () => {
      await onSave({
        phone,
        direction,
        startedAt: fromDatetimeLocal(startedAt),
        durationSec: Number(durationSec) || 0,
        transcript,
      })
      closeModal()
    })
  }, [
    closeModal,
    direction,
    durationSec,
    onSave,
    phone,
    setOnConfirmFunc,
    startedAt,
    transcript,
  ])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <Input
          label="Телефон"
          type="phone"
          value={phone}
          onChange={setPhone}
          noMargin
          fullWidth
        />
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Направление
          <select
            className="h-10 rounded border border-gray-300 bg-white px-2 text-black"
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
          >
            <option value="incoming">Входящий</option>
            <option value="outgoing">Исходящий</option>
            <option value="unknown">Неизвестно</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Время звонка
          <input
            type="datetime-local"
            className="h-10 rounded border border-gray-300 bg-white px-2 text-black"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
          />
        </label>
        <Input
          label="Длительность, сек"
          type="number"
          min={0}
          value={durationSec}
          onChange={setDurationSec}
          noMargin
          fullWidth
        />
      </div>
      <Textarea
        label="Transcript / заметки по разговору"
        value={transcript}
        onChange={setTranscript}
        rows={10}
        noMargin
        fullWidth
      />
    </div>
  )
}

const CallsContent = () => {
  const [status, setStatus] = useState('all')
  const { data: callsPayload, isLoading, refetch } = useCallsQuery({ status })
  const calls = callsPayload?.data ?? []
  const { data: clients = [] } = useClientsQuery()
  const callActions = useCallActions()
  const clientActions = useClientActions()
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const snackbar = useSnackbar()

  const clientsById = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => map.set(String(client?._id), client))
    return map
  }, [clients])

  const openCallEditor = (call = null) => {
    modalsFunc.add({
      title: call?._id ? 'Редактировать звонок' : 'Добавить звонок',
      Children: (props) => (
        <CallEditorModal
          {...props}
          initialCall={call}
          onSave={async (payload) => {
            if (call?._id) await callActions.update(call._id, payload)
            else await callActions.create(payload)
            snackbar.success('Звонок сохранен')
            refetch()
          }}
        />
      ),
      declineButtonName: 'Отмена',
    })
  }

  const createClientFromCall = async (call) => {
    const name = call?.aiExtractedFields?.clientName || ''
    const nameParts = splitClientName(name)
    const normalizedPhone = call?.normalizedPhone || call?.phone || ''
    const client = await clientActions.set({
      ...nameParts,
      phone: normalizedPhone ? Number(normalizedPhone) : null,
      whatsapp: normalizedPhone ? Number(normalizedPhone) : null,
      clientType: 'none',
    })
    await callActions.link(call._id, { clientId: client._id })
    snackbar.success('Клиент создан и связан со звонком')
    refetch()
    return client
  }

  const openEventDraft = async (call) => {
    let nextCall = call
    if (!nextCall?.linkedClientId) {
      const client = await createClientFromCall(call)
      nextCall = { ...call, linkedClientId: client._id }
    }
    const draft = await callActions.getEventDraft(nextCall._id)
    modalsFunc.event?.createFromDraft?.(
      {
        ...draft,
        clientId: nextCall.linkedClientId,
      },
      async (event) => {
        await callActions.link(nextCall._id, {
          clientId: event?.clientId,
          eventId: event?._id,
        })
        snackbar.success('Заявка создана из звонка')
        refetch()
      }
    )
  }

  const analyzeCall = async (call) => {
    await callActions.analyze(call._id)
    snackbar.success('Звонок проанализирован')
    refetch()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <div className="text-xl font-semibold text-gray-900">Звонки</div>
          <div className="text-sm text-gray-600">
            Журнал разговоров и AI-черновики заявок
          </div>
        </div>
        <AppButton onClick={() => openCallEditor()} className="gap-2">
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          Добавить звонок
        </AppButton>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              status === option.value
                ? 'border-general bg-general text-white'
                : 'border-gray-300 bg-white text-gray-700'
            }`}
            onClick={() => setStatus(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <div className="py-6 text-gray-600">Загрузка...</div>}
        {!isLoading && calls.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 p-5 text-sm text-gray-600">
            Звонков пока нет. До подключения IP-телефонии можно добавить тестовый
            звонок вручную и проверить AI-черновик.
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
          {calls.map((call) => {
            const client = call?.linkedClientId
              ? clientsById.get(String(call.linkedClientId))
              : null
            const fields = call?.aiExtractedFields ?? {}
            return (
              <div
                key={call._id}
                className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                      <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
                      <span className="truncate">
                        {call.phone || call.normalizedPhone || 'Без номера'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {DIRECTION_LABELS[call.direction] || 'Звонок'} ·{' '}
                      {formatDateTime(call.startedAt)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {STATUS_LABELS[call.status] || call.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 tablet:grid-cols-2">
                  <div>
                    <span className="text-gray-500">Клиент: </span>
                    {client ? getClientLabel(client) : 'не связан'}
                  </div>
                  <div>
                    <span className="text-gray-500">Длительность: </span>
                    {Number(call.durationSec || 0)} сек
                  </div>
                </div>

                {call.aiSummary && (
                  <div className="rounded bg-gray-50 p-2 text-sm leading-5 text-gray-800">
                    {call.aiSummary}
                  </div>
                )}

                {(fields.eventDate || fields.budget || fields.nextContactAt) && (
                  <div className="grid grid-cols-1 gap-2 text-sm tablet:grid-cols-3">
                    <div className="rounded bg-blue-50 p-2">
                      <div className="text-gray-500">Дата</div>
                      <div>{fields.eventDate ? formatDateTime(fields.eventDate) : '-'}</div>
                    </div>
                    <div className="rounded bg-green-50 p-2">
                      <div className="text-gray-500">Бюджет</div>
                      <div>{fields.budget ? `${fields.budget} ₽` : '-'}</div>
                    </div>
                    <div className="rounded bg-amber-50 p-2">
                      <div className="text-gray-500">Контакт</div>
                      <div>
                        {fields.nextContactAt
                          ? formatDateTime(fields.nextContactAt)
                          : '-'}
                      </div>
                    </div>
                  </div>
                )}

                {call.processingError && (
                  <div className="text-sm text-red-600">{call.processingError}</div>
                )}

                <div className="flex flex-wrap gap-2">
                  <AppButton
                    size="sm"
                    variant="secondary"
                    onClick={() => openCallEditor(call)}
                  >
                    Открыть
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="secondary"
                    disabled={!call.transcript || call.status === 'processing'}
                    onClick={() => analyzeCall(call)}
                    className="gap-2"
                  >
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      className="h-3.5 w-3.5"
                    />
                    AI-анализ
                  </AppButton>
                  {!call.linkedClientId && (
                    <AppButton
                      size="sm"
                      variant="secondary"
                      onClick={() => createClientFromCall(call)}
                      className="gap-2"
                    >
                      <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
                      Создать клиента
                    </AppButton>
                  )}
                  <AppButton
                    size="sm"
                    disabled={!call.transcript && !call.aiSummary}
                    onClick={() => openEventDraft(call)}
                  >
                    Создать заявку
                  </AppButton>
                  {call.status !== 'ignored' && (
                    <AppButton
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await callActions.ignore(call._id)
                        snackbar.success('Звонок скрыт как не клиент')
                        refetch()
                      }}
                    >
                      Не клиент
                    </AppButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CallsContent
