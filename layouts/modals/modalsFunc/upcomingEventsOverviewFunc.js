import AppButton from '@components/AppButton'
import ModalSection from '@components/ModalSection'
import QuickActionButtons from '@components/QuickActionButtons'
import StatusChip from '@components/StatusChip'
import formatDateTime from '@helpers/formatDateTime'
import {
  getAdditionalEventSegment,
  getAdditionalEventsListBySegments,
  getSoonNoDepositEvents,
  getUpcomingEventsByDays,
} from '@helpers/additionalEvents'
import {
  getServerSyncQueueSummary,
  readServerSyncQueue,
  SERVER_SYNC_FLUSH_NOW_EVENT,
  SERVER_SYNC_QUEUE_CHANGED_EVENT,
} from '@helpers/serverSyncQueue'
import { modalsFuncAtom } from '@state/atoms'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import { useEventsQuery } from '@helpers/useEventsQuery'
import { useTransactionsQuery } from '@helpers/useTransactionsQuery'
import {
  getEventAddressLine,
  getEventTitle,
  getPostponeActionsForSegment,
  moveDateToDayOffset,
} from '@helpers/upcomingEventsOverview'
import AdditionalEventCard from './AdditionalEventCard'
import openEventAdditionalEventEditorModal from './eventAdditionalEventEditorModal'
import openEventAdditionalEventViewModal from './eventAdditionalEventViewModal'

const SEGMENT_META = {
  overdue: {
    title: 'Просрочено',
    emptyText: 'Просроченных доп. событий нет',
    tone: 'overdue',
  },
  today: {
    title: 'Сегодня',
    emptyText: 'На сегодня доп. событий нет',
    tone: 'today',
  },
  tomorrow: {
    title: 'Завтра',
    emptyText: 'На завтра доп. событий нет',
    tone: 'tomorrow',
  },
}

const normalizeText = (value, fallback = '') => {
  if (!value) return fallback
  return String(value).replace(/<[^>]+>/g, '').trim() || fallback
}

const parseDateSafe = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const isSameDay = (a, b) => {
  const dateA = parseDateSafe(a)
  const dateB = parseDateSafe(b)
  if (!dateA || !dateB) return false
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

const readQueueSummary = () => getServerSyncQueueSummary(readServerSyncQueue())

const upcomingEventsOverviewFunc = () => {
  const UpcomingEventsOverviewModal = ({ closeModal }) => {
    const { data: eventsPayload } = useEventsQuery({
      scope: 'upcoming',
      enabled: false,
    })
    const events = useMemo(() => eventsPayload?.data ?? [], [eventsPayload?.data])
    const { data: transactions = [] } = useTransactionsQuery(undefined, {
      enabled: false,
    })
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const [savingKey, setSavingKey] = useState('')
    const [queueSummary, setQueueSummary] = useState(readQueueSummary)
    const [isOnline, setIsOnline] = useState(() =>
      typeof navigator === 'undefined' ? true : navigator.onLine
    )

    const now = useMemo(() => new Date(), [])
    const segmentedAdditional = useMemo(
      () => getAdditionalEventsListBySegments(events, now),
      [events, now]
    )
    const overdueNoDepositEvents = useMemo(
      () => getSoonNoDepositEvents(events, transactions, now, 3),
      [events, transactions, now]
    )
    const upcomingEvents = useMemo(
      () => getUpcomingEventsByDays(events, 3, now),
      [events, now]
    )
    const segmentedItems = useMemo(() => {
      const withType = (items) =>
        (Array.isArray(items) ? items : []).map((item) => ({
          ...item,
          reminderType: 'additional',
        }))
      const overdueNoDepositItems = overdueNoDepositEvents.map((event) => ({
        eventId: event?._id,
        eventDate: event?.eventDate ?? null,
        eventType: event?.eventType ?? '',
        eventStatus: event?.status ?? '',
        eventAddress: event?.address ?? null,
        eventTown: event?.address?.town ?? '',
        eventDescription: event?.description ?? '',
        title: 'Просрочен задаток',
        description:
          Number(event?.depositExpectedAmount ?? 0) > 0
            ? `Ожидается: ${Number(event.depositExpectedAmount).toLocaleString('ru-RU')} ₽`
            : '',
        date: event?.depositDueAt ?? null,
        index: -1,
        reminderType: 'depositOverdue',
      }))

      const parseTime = (value) => {
        const date = parseDateSafe(value)
        return date ? date.getTime() : 0
      }

      const overdue = withType(segmentedAdditional.overdue)
        .concat(overdueNoDepositItems)
        .sort((a, b) => parseTime(a?.date) - parseTime(b?.date))

      const doneBySegment = {
        overdue: [],
        today: [],
        tomorrow: [],
      }
      ;(Array.isArray(events) ? events : []).forEach((event) => {
        ;(Array.isArray(event?.additionalEvents) ? event.additionalEvents : []).forEach(
          (item, index) => {
            if (!item?.done) return
            const segment = getAdditionalEventSegment(item?.date, now)
            if (!segment || !(segment in doneBySegment)) return
            if (segment === 'overdue' && !isSameDay(item?.doneAt, now)) return
            doneBySegment[segment].push({
              eventId: event?._id,
              eventDate: event?.eventDate ?? null,
              eventType: event?.eventType ?? '',
              eventStatus: event?.status ?? '',
              eventAddress: event?.address ?? null,
              eventTown: event?.address?.town ?? '',
              eventDescription: event?.description ?? '',
              title: item?.title ?? '',
              description: item?.description ?? '',
              date: item?.date ?? null,
              doneAt: item?.doneAt ?? null,
              index,
              done: true,
              reminderType: 'additional_done',
            })
          }
        )
      })

      Object.keys(doneBySegment).forEach((key) => {
        doneBySegment[key].sort((a, b) => parseTime(a?.date) - parseTime(b?.date))
      })

      return {
        overdue: overdue.concat(doneBySegment.overdue),
        today: withType(segmentedAdditional.today).concat(doneBySegment.today),
        tomorrow: withType(segmentedAdditional.tomorrow).concat(doneBySegment.tomorrow),
      }
    }, [events, now, overdueNoDepositEvents, segmentedAdditional])

    const getEventById = (eventId) =>
      (events ?? []).find((item) => String(item?._id) === String(eventId))

    const getAdditionalEventSource = (eventId, additionalEventIndex) => {
      const event = getEventById(eventId)
      if (!event) return { event: null, sourceItem: null, additionalEvents: [] }
      const additionalEvents = Array.isArray(event.additionalEvents)
        ? event.additionalEvents
        : []
      return {
        event,
        sourceItem: additionalEvents[additionalEventIndex] ?? null,
        additionalEvents,
      }
    }

    const updateAdditionalEvents = async (eventId, nextAdditionalEvents) => {
      const event = getEventById(eventId)
      if (!event) return
      await itemsFunc?.event?.set(
        {
          _id: event._id,
          additionalEvents: nextAdditionalEvents,
        },
        false,
        true
      )
    }

    const updateAdditionalEventDate = async (
      eventId,
      additionalEventIndex,
      date
    ) => {
      if (!eventId || !date) return
      const { sourceItem, additionalEvents } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!sourceItem) return
      const nextAdditionalEvents = additionalEvents.map((item, idx) =>
        idx === additionalEventIndex ? { ...item, date: date.toISOString() } : item
      )
      const actionKey = `${eventId}-${additionalEventIndex}`
      try {
        setSavingKey(actionKey)
        await updateAdditionalEvents(eventId, nextAdditionalEvents)
      } finally {
        setSavingKey('')
      }
    }

    const shiftAdditionalEventDate = async (
      eventId,
      additionalEventIndex,
      targetDayOffset
    ) => {
      const { sourceItem } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!sourceItem) return
      const baseDate = parseDateSafe(sourceItem?.date) || new Date()
      const nextDate = moveDateToDayOffset(baseDate, targetDayOffset, now)
      await updateAdditionalEventDate(eventId, additionalEventIndex, nextDate)
    }

    const openEvent = (eventId) => {
      closeModal?.()
      setTimeout(() => modalsFunc.event?.view(eventId), 150)
    }

    const toggleAdditionalEventDone = async (eventId, additionalEventIndex) => {
      const { sourceItem, additionalEvents } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!sourceItem) return

      const nextAdditionalEvents = additionalEvents.map((item, idx) =>
        idx === additionalEventIndex
          ? {
              ...item,
              done: !Boolean(item?.done),
              doneAt: !Boolean(item?.done) ? new Date().toISOString() : null,
            }
          : item
      )
      await updateAdditionalEvents(eventId, nextAdditionalEvents)
    }

    const editAdditionalEvent = (eventId, additionalEventIndex) => {
      const { sourceItem } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!sourceItem) return
      openEventAdditionalEventEditorModal({
        modalsFunc,
        index: additionalEventIndex,
        sourceItem,
        onConfirm: async (nextItem) => {
          const { additionalEvents } = getAdditionalEventSource(
            eventId,
            additionalEventIndex
          )
          const nextAdditionalEvents = additionalEvents.map((item, idx) =>
            idx === additionalEventIndex ? { ...item, ...nextItem } : item
          )
          await updateAdditionalEvents(eventId, nextAdditionalEvents)
        },
      })
    }

    const deleteAdditionalEvent = async (eventId, additionalEventIndex) => {
      const { sourceItem, additionalEvents } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!sourceItem) return
      const nextAdditionalEvents = additionalEvents.filter(
        (_, idx) => idx !== additionalEventIndex
      )
      await updateAdditionalEvents(eventId, nextAdditionalEvents)
    }

    const confirmDeleteAdditionalEvent = (eventId, additionalEventIndex) => {
      const { sourceItem } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!sourceItem) return
      modalsFunc.confirm({
        title: 'Удаление доп. события',
        text: 'Удалить это доп. событие?',
        onConfirm: async () => {
          await deleteAdditionalEvent(eventId, additionalEventIndex)
        },
      })
    }

    const openAdditionalEventView = (eventId, additionalEventIndex) => {
      const { event, sourceItem } = getAdditionalEventSource(
        eventId,
        additionalEventIndex
      )
      if (!event || !sourceItem) return
      openEventAdditionalEventViewModal({
        modalsFunc,
        event,
        item: sourceItem,
        index: additionalEventIndex,
        onToggleDone: (index) => toggleAdditionalEventDone(eventId, index),
        onEdit: (index) => editAdditionalEvent(eventId, index),
        onDelete: (index) => deleteAdditionalEvent(eventId, index),
        onOpenEvent: () => openEvent(eventId),
      })
    }

    useEffect(() => {
      const refreshQueueState = () => {
        setQueueSummary(readQueueSummary())
        setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
      }

      refreshQueueState()
      window.addEventListener(SERVER_SYNC_QUEUE_CHANGED_EVENT, refreshQueueState)
      window.addEventListener('online', refreshQueueState)
      window.addEventListener('offline', refreshQueueState)

      return () => {
        window.removeEventListener(
          SERVER_SYNC_QUEUE_CHANGED_EVENT,
          refreshQueueState
        )
        window.removeEventListener('online', refreshQueueState)
        window.removeEventListener('offline', refreshQueueState)
      }
    }, [])

    const requestSync = () => {
      window.dispatchEvent(new CustomEvent(SERVER_SYNC_FLUSH_NOW_EVENT))
      setTimeout(() => setQueueSummary(readQueueSummary()), 250)
    }

    const syncTone =
      queueSummary.conflict > 0 || queueSummary.failed > 0
        ? 'overdue'
        : queueSummary.syncing > 0
          ? 'today'
          : 'upcoming'
    const syncButtonDisabled =
      !isOnline || queueSummary.ready === 0 || queueSummary.syncing > 0

    return (
      <div className="flex flex-col gap-3 pb-2">
        {Object.keys(SEGMENT_META).map((key) => {
          const meta = SEGMENT_META[key]
          const items = segmentedItems[key] ?? []
          return (
            <ModalSection
              key={key}
              title={meta.title}
              titleClassName="card-title"
              titleRight={<StatusChip tone={meta.tone}>{items.length}</StatusChip>}
            >
              {items.length === 0 ? (
                <div className="mt-2 text-sm text-gray-500">{meta.emptyText}</div>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {items.slice(0, 12).map((item, idx) => {
                    const eventAddressLine = getEventAddressLine({
                      address: item.eventAddress,
                    })
                    const keyValue = `${item.eventId}-${item.index}-${idx}`

                    if (
                      item.reminderType === 'additional' ||
                      item.reminderType === 'additional_done'
                    ) {
                      return (
                        <AdditionalEventCard
                          key={keyValue}
                          item={{
                            ...item,
                            displayDate:
                              item.reminderType === 'additional_done'
                                ? item.doneAt ?? item.date
                                : item.date,
                            displayDateLabel:
                              item.reminderType === 'additional_done'
                                ? 'Выполнено'
                                : '',
                            title: normalizeText(item.title, 'Доп. событие'),
                            description: normalizeText(item.description),
                          }}
                          index={item.index}
                          onOpen={() =>
                            openAdditionalEventView(item.eventId, item.index)
                          }
                          onOpenEvent={() => openEvent(item.eventId)}
                          onToggleDone={(index) =>
                            toggleAdditionalEventDone(item.eventId, index)
                          }
                          onEdit={(index) =>
                            editAdditionalEvent(item.eventId, index)
                          }
                          onDelete={(index) =>
                            confirmDeleteAdditionalEvent(item.eventId, index)
                          }
                        >
                          <div className="text-xs text-gray-500">
                            {getEventTitle(item)}
                            {item.eventDate
                              ? ` • начало ${formatDateTime(
                                  item.eventDate,
                                  true,
                                  false,
                                  true,
                                  false
                                )}`
                              : ''}
                          </div>
                          {eventAddressLine ? (
                            <div className="text-xs text-gray-500">
                              {eventAddressLine}
                            </div>
                          ) : null}
                          {item.reminderType === 'additional' ? (
                            <div
                              className="mt-2"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <QuickActionButtons
                                actions={getPostponeActionsForSegment(key).map(
                                  (action) => ({
                                    key: action.key,
                                    label: action.label,
                                    variant: 'secondary',
                                    className: 'w-full tablet:w-auto',
                                    disabled:
                                      savingKey ===
                                      `${item.eventId}-${item.index}`,
                                    onClick: () =>
                                      shiftAdditionalEventDate(
                                        item.eventId,
                                        item.index,
                                        action.targetDayOffset
                                      ),
                                  })
                                )}
                              />
                            </div>
                          ) : null}
                        </AdditionalEventCard>
                      )
                    }

                    return (
                      <div
                        key={keyValue}
                        className="rounded border border-gray-200 px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {normalizeText(item.title, 'Напоминание')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.date
                            ? formatDateTime(item.date, true, false, true, false)
                            : 'Дата не указана'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {getEventTitle(item)}
                          {item.eventDate
                            ? ` • начало ${formatDateTime(
                                item.eventDate,
                                true,
                                false,
                                true,
                                false
                              )}`
                            : ''}
                        </div>
                        {eventAddressLine ? (
                          <div className="text-xs text-gray-500">
                            {eventAddressLine}
                          </div>
                        ) : null}
                        {item?.description ? (
                          <div className="text-xs text-gray-600">
                            {normalizeText(item.description)}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </ModalSection>
          )
        })}

        {queueSummary.total > 0 ? (
          <ModalSection
            title="Синхронизация"
            titleClassName="card-title"
            titleRight={
              <StatusChip tone={syncTone}>{queueSummary.total}</StatusChip>
            }
          >
            <div className="mt-2 rounded border border-gray-200 px-3 py-2">
              <div className="text-sm font-semibold text-gray-900">
                {isOnline
                  ? queueSummary.syncing > 0
                    ? 'Синхронизация выполняется'
                    : 'Есть локальные изменения'
                  : 'Нет сети'}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Ожидают отправки: {queueSummary.pending}. Готовы к повтору:{' '}
                {queueSummary.ready}. Ошибки: {queueSummary.failed}. Конфликты:{' '}
                {queueSummary.conflict}.
              </div>
              {queueSummary.waitingRetry > 0 ? (
                <div className="mt-1 text-xs text-gray-500">
                  {queueSummary.waitingRetry} измен. будут повторены позже
                </div>
              ) : null}
              {queueSummary.conflict > 0 ? (
                <div className="mt-1 text-xs text-red-600">
                  Есть конфликт: изменение не будет отправлено автоматически.
                </div>
              ) : null}
              <AppButton
                variant="secondary"
                size="sm"
                className="mt-2 w-full tablet:w-auto"
                disabled={syncButtonDisabled}
                onClick={requestSync}
              >
                Синхронизировать
              </AppButton>
            </div>
          </ModalSection>
        ) : null}

        <ModalSection
          title="Мероприятия на 3 дня"
          titleClassName="card-title"
          titleRight={<StatusChip tone="upcoming">{upcomingEvents.length}</StatusChip>}
        >
          {upcomingEvents.length === 0 ? (
            <div className="mt-2 text-sm text-gray-500">
              В ближайшие 3 дня мероприятий нет
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {upcomingEvents.slice(0, 12).map((event) => (
                <div
                  key={event._id}
                  className="rounded border border-gray-200 px-3 py-2"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {event?.eventDate
                      ? formatDateTime(event.eventDate, true, false, true, false)
                      : 'Дата не указана'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getEventTitle(event)}
                  </div>
                  {getEventAddressLine(event) ? (
                    <div className="text-xs text-gray-600">
                      {getEventAddressLine(event)}
                    </div>
                  ) : null}
                  {event?.description ? (
                    <div className="text-xs text-gray-600">
                      {normalizeText(event.description)}
                    </div>
                  ) : null}
                  <QuickActionButtons
                    wrapperClassName="mt-2"
                    actions={[
                      {
                        key: 'open-event',
                        label: 'Открыть мероприятие',
                        variant: 'secondary',
                        className: 'w-full tablet:w-auto',
                        onClick: () => openEvent(event._id),
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </ModalSection>
      </div>
    )
  }

  return {
    title: 'Требует внимания',
    confirmButtonName: 'Закрыть',
    showDecline: false,
    onConfirm: true,
    Children: UpcomingEventsOverviewModal,
  }
}

export default upcomingEventsOverviewFunc
