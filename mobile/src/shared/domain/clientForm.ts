import type { Client } from './types'

export type SignificantDateDraft = NonNullable<Client['significantDates']>[number] & {
  localKey: string
  dateInput: string
}

export const formatSignificantDateInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export const parseSignificantDateInput = (value: string) => {
  if (!value.trim()) return null
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day, 12)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined
  return date.toISOString()
}

export const serializeSignificantDates = (items: SignificantDateDraft[]) => items
  .map((item) => ({
    ...(item._id ? { _id: item._id } : {}),
    title: item.title?.trim() || '',
    date: parseSignificantDateInput(item.dateInput) ?? null,
    comment: item.comment?.trim() || '',
  }))
  .filter((item) => item.title || item.date || item.comment)

export const validateSignificantDates = (items: SignificantDateDraft[]) => {
  if (items.some((item) => parseSignificantDateInput(item.dateInput) === undefined)) {
    return 'Значимая дата должна быть в формате ГГГГ-ММ-ДД'
  }
  if (items.some((item) => !item.title?.trim() && Boolean(item.dateInput || item.comment?.trim()))) {
    return 'Укажите название значимой даты'
  }
  return ''
}
