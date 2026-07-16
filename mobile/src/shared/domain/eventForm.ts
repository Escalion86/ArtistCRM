import type { Event } from './types'

export type EventTaskDraft = NonNullable<Event['additionalEvents']>[number] & {
  localKey: string
  dateInput: string
}

export const formatEventDateInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16).replace('T', ' ')
}

export const parseEventDateInput = (value: string) => {
  if (!value.trim()) return null
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day, hour, minute] = match.map(Number)
  const date = new Date(year, month - 1, day, hour, minute)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return undefined
  return date.toISOString()
}

export const validateEventDates = ({
  eventDate,
  dateEnd,
  depositDueAt,
  tasks,
}: {
  eventDate: string
  dateEnd: string
  depositDueAt: string
  tasks: EventTaskDraft[]
}) => {
  const parsedEventDate = parseEventDateInput(eventDate)
  const parsedDateEnd = parseEventDateInput(dateEnd)
  if (parsedEventDate === undefined || parsedDateEnd === undefined) {
    return 'Дата мероприятия должна быть в формате ГГГГ-ММ-ДД ЧЧ:ММ'
  }
  if (parsedEventDate && parsedDateEnd && parsedEventDate > parsedDateEnd) {
    return 'Дата окончания не может быть раньше даты начала'
  }
  if (parseEventDateInput(depositDueAt) === undefined) {
    return 'Срок задатка должен быть в формате ГГГГ-ММ-ДД ЧЧ:ММ'
  }
  if (tasks.some((task) => parseEventDateInput(task.dateInput) === undefined)) {
    return 'Срок контакта должен быть в формате ГГГГ-ММ-ДД ЧЧ:ММ'
  }
  if (tasks.some((task) => !task.title?.trim())) {
    return 'У каждого следующего контакта должно быть название'
  }
  return ''
}

export const serializeEventTasks = (tasks: EventTaskDraft[]) => tasks.map((task) => ({
  ...(task._id ? { _id: task._id } : {}),
  title: task.title?.trim() || '',
  description: task.description?.trim() || '',
  date: parseEventDateInput(task.dateInput) ?? null,
  done: Boolean(task.done),
  doneAt: task.doneAt || null,
}))
