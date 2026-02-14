import AppButton from '@components/AppButton'
import formatDateTime from '@helpers/formatDateTime'
import {
  getAdditionalEventsListBySegments,
  getUpcomingEventsByDays,
} from '@helpers/additionalEvents'
import { modalsFuncAtom } from '@state/atoms'
import eventsAtom from '@state/atoms/eventsAtom'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { useAtomValue } from 'jotai'
import { useMemo, useState } from 'react'

const SEGMENT_META = {
  overdue: {
    title: 'Просрочено',
    emptyText: 'Просроченных доп. событий нет',
    titleClassName: 'text-red-700',
  },
  today: {
    title: 'Сегодня',
    emptyText: 'На сегодня доп. событий нет',
    titleClassName: 'text-amber-700',
  },
  tomorrow: {
    title: 'Завтра',
    emptyText: 'На завтра доп. событий нет',
    titleClassName: 'text-emerald-700',
  },
}

const getEventStatusLabel = (status) => {
  if (status === 'draft') return 'Заявка'
  if (status === 'active') return 'Активно'
  if (status === 'closed') return 'Закрыто'
  if (status === 'canceled') return 'Отменено'
  return status || 'Не указан'
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

const toDateTimeLocalValue = (value) => {
  const date = parseDateSafe(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const upcomingEventsOverviewFunc = () => {
  const UpcomingEventsOverviewModal = ({ closeModal }) => {
    const events = useAtomValue(eventsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const [customDates, setCustomDates] = useState({})
    const [savingKey, setSavingKey] = useState('')

    const now = useMemo(() => new Date(), [])
    const segmentedAdditional = useMemo(
      () => getAdditionalEventsListBySegments(events, now),
      [events, now]
    )
    const upcomingEvents = useMemo(
      () => getUpcomingEventsByDays(events, 3, now),
      [events, now]
    )

    const openEvent = (eventId) => {
      closeModal?.()
      setTimeout(() => modalsFunc.event?.view(eventId), 150)
    }

    const updateAdditionalEventDate = async (eventId, additionalEventIndex, date) => {
      if (!eventId || !date) return
      const event = (events ?? []).find((item) => String(item?._id) === String(eventId))
      if (!event) return
      const additionalEvents = Array.isArray(event.additionalEvents)
        ? event.additionalEvents
        : []
      const nextAdditionalEvents = additionalEvents.map((item, idx) =>
        idx === additionalEventIndex ? { ...item, date: date.toISOString() } : item
      )
      const actionKey = `${eventId}-${additionalEventIndex}`
      try {
        setSavingKey(actionKey)
        await itemsFunc?.event?.set(
          {
            _id: event._id,
            additionalEvents: nextAdditionalEvents,
          },
          false,
          true
        )
      } finally {
        setSavingKey('')
      }
    }

    const shiftAdditionalEventDate = async (
      eventId,
      additionalEventIndex,
      days
    ) => {
      const source = segmentedAdditional.overdue
        .concat(segmentedAdditional.today)
        .concat(segmentedAdditional.tomorrow)
        .find(
          (item) =>
            String(item.eventId) === String(eventId) &&
            item.index === additionalEventIndex
        )
      const baseDate = parseDateSafe(source?.date) || new Date()
      const nextDate = new Date(baseDate)
      nextDate.setDate(nextDate.getDate() + days)
      await updateAdditionalEventDate(eventId, additionalEventIndex, nextDate)
    }

    const applyCustomDate = async (eventId, additionalEventIndex) => {
      const key = `${eventId}-${additionalEventIndex}`
      const rawValue = customDates[key]
      if (!rawValue) return
      const nextDate = parseDateSafe(rawValue)
      if (!nextDate) return
      await updateAdditionalEventDate(eventId, additionalEventIndex, nextDate)
    }

    return (
      <div className="flex flex-col gap-3 pb-2">
        {Object.keys(SEGMENT_META).map((key) => {
          const meta = SEGMENT_META[key]
          const items = segmentedAdditional[key] ?? []
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-3">
              <div className={`text-sm font-semibold ${meta.titleClassName}`}>
                {meta.title}: {items.length}
              </div>
              {items.length === 0 ? (
                <div className="mt-2 text-sm text-gray-500">{meta.emptyText}</div>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {items.slice(0, 12).map((item, idx) => (
                    <div
                      key={`${item.eventId}-${item.index}-${idx}`}
                      className="rounded border border-gray-200 px-3 py-2"
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {normalizeText(item.title, 'Доп. событие')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.date
                          ? formatDateTime(item.date, true, false, true, false)
                          : 'Дата не указана'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {normalizeText(item.description, 'Без описания')}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.eventTown ? `${item.eventTown} • ` : ''}
                        {getEventStatusLabel(item.eventStatus)}
                      </div>
                      <div className="mt-2">
                        <AppButton
                          size="sm"
                          variant="secondary"
                          className="rounded"
                          onClick={() => openEvent(item.eventId)}
                        >
                          Открыть мероприятие
                        </AppButton>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <AppButton
                          size="sm"
                          variant="secondary"
                          className="rounded"
                          disabled={savingKey === `${item.eventId}-${item.index}`}
                          onClick={() =>
                            shiftAdditionalEventDate(item.eventId, item.index, 1)
                          }
                        >
                          +1 день
                        </AppButton>
                        <AppButton
                          size="sm"
                          variant="secondary"
                          className="rounded"
                          disabled={savingKey === `${item.eventId}-${item.index}`}
                          onClick={() =>
                            shiftAdditionalEventDate(item.eventId, item.index, 3)
                          }
                        >
                          +3 дня
                        </AppButton>
                        <input
                          type="datetime-local"
                          className="h-8 rounded border border-gray-300 px-2 text-xs text-gray-800 outline-none focus:border-general"
                          value={
                            customDates[`${item.eventId}-${item.index}`] ??
                            toDateTimeLocalValue(item.date)
                          }
                          onChange={(event) =>
                            setCustomDates((prev) => ({
                              ...prev,
                              [`${item.eventId}-${item.index}`]: event.target.value,
                            }))
                          }
                        />
                        <AppButton
                          size="sm"
                          variant="primary"
                          className="rounded"
                          disabled={savingKey === `${item.eventId}-${item.index}`}
                          onClick={() => applyCustomDate(item.eventId, item.index)}
                        >
                          Применить
                        </AppButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-sm font-semibold text-sky-700">
            Мероприятия на 3 дня: {upcomingEvents.length}
          </div>
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
                    {event?.address?.town ? `${event.address.town} • ` : ''}
                    {getEventStatusLabel(event?.status)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {normalizeText(event?.description, 'Описание не указано')}
                  </div>
                  <div className="mt-2">
                    <AppButton
                      size="sm"
                      variant="secondary"
                      className="rounded"
                      onClick={() => openEvent(event._id)}
                    >
                      Открыть мероприятие
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return {
    title: 'Ближайшие события',
    confirmButtonName: 'Закрыть',
    showDecline: false,
    onConfirm: true,
    Children: UpcomingEventsOverviewModal,
  }
}

export default upcomingEventsOverviewFunc
