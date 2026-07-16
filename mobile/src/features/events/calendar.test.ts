import type { Event } from '../../shared/domain/types'
import {
  buildCalendarMonth,
  buildEventCalendarOccurrences,
  countOccurrencesByDate,
  moveMonth,
  toDateKey,
} from './calendar'

describe('mobile event calendar', () => {
  it('parses date-only values in local time and rejects impossible dates', () => {
    expect(toDateKey('2026-07-15')).toBe('2026-07-15')
    expect(toDateKey('2026-02-30')).toBeNull()
    expect(toDateKey('not-a-date')).toBeNull()
  })

  it('builds a stable six-week grid starting on Monday', () => {
    const days = buildCalendarMonth(new Date(2026, 6, 20), new Date(2026, 6, 15))
    expect(days).toHaveLength(42)
    expect(days[0]).toMatchObject({ dateKey: '2026-06-29', inMonth: false })
    expect(days[16]).toMatchObject({ dateKey: '2026-07-15', inMonth: true, isToday: true })
    expect(days[41].dateKey).toBe('2026-08-09')
  })

  it('adds event dates and contact tasks to day counters', () => {
    const event: Event = {
      _id: 'event-1',
      status: 'active',
      eventDate: '2026-07-20T18:00:00+07:00',
      additionalEvents: [
        { _id: 'contact-1', title: 'Позвонить', date: '2026-07-15T10:00:00+07:00' },
        { _id: 'contact-2', title: 'Уточнить меню', date: '2026-07-15T12:00:00+07:00', done: true },
      ],
    }
    const occurrences = buildEventCalendarOccurrences([event])
    expect(occurrences.map(({ kind, dateKey }) => [kind, dateKey])).toEqual([
      ['event', '2026-07-20'],
      ['contact', '2026-07-15'],
      ['contact', '2026-07-15'],
    ])
    expect(countOccurrencesByDate(occurrences)).toEqual({ '2026-07-20': 1, '2026-07-15': 2 })
  })

  it('moves between years without carrying an invalid day', () => {
    expect(toDateKey(moveMonth(new Date(2026, 0, 31), -1))).toBe('2025-12-01')
    expect(toDateKey(moveMonth(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
  })
})

