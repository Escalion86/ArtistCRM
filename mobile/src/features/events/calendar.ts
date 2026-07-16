import type { Event } from '../../shared/domain/types'

export type CalendarDay = {
  date: Date
  dateKey: string
  day: number
  inMonth: boolean
  isToday: boolean
}

export type EventCalendarOccurrence = {
  key: string
  dateKey: string
  event: Event
  kind: 'event' | 'contact'
  title?: string
  done?: boolean
}

const pad = (value: number) => String(value).padStart(2, '0')

export const toLocalDate = (value?: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value)

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    return date.getFullYear() === Number(dateOnly[1])
      && date.getMonth() === Number(dateOnly[2]) - 1
      && date.getDate() === Number(dateOnly[3]) ? date : null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const toDateKey = (value?: string | Date | null) => {
  const date = toLocalDate(value)
  if (!date) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1)

export const moveMonth = (value: Date, amount: number) => (
  new Date(value.getFullYear(), value.getMonth() + amount, 1)
)

export const buildCalendarMonth = (month: Date, today = new Date()): CalendarDay[] => {
  const first = startOfMonth(month)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset)
  const todayKey = toDateKey(today)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const dateKey = toDateKey(date) as string
    return {
      date,
      dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === first.getMonth() && date.getFullYear() === first.getFullYear(),
      isToday: dateKey === todayKey,
    }
  })
}

export const buildEventCalendarOccurrences = (events: Event[]): EventCalendarOccurrence[] => (
  events.flatMap((event) => {
    const occurrences: EventCalendarOccurrence[] = []
    const eventDateKey = toDateKey(event.eventDate)
    if (eventDateKey) {
      occurrences.push({ key: `${event._id}:event`, dateKey: eventDateKey, event, kind: 'event' })
    }
    event.additionalEvents?.forEach((contact, index) => {
      const dateKey = toDateKey(contact.date)
      if (!dateKey) return
      occurrences.push({
        key: `${event._id}:contact:${contact._id || index}`,
        dateKey,
        event,
        kind: 'contact',
        title: contact.title || 'Следующий контакт',
        done: Boolean(contact.done),
      })
    })
    return occurrences
  })
)

export const countOccurrencesByDate = (occurrences: EventCalendarOccurrence[]) => {
  const counts: Record<string, number> = {}
  occurrences.forEach(({ dateKey }) => { counts[dateKey] = (counts[dateKey] || 0) + 1 })
  return counts
}

export const formatMonthTitle = (month: Date) => {
  const value = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return value.charAt(0).toUpperCase() + value.slice(1)
}

