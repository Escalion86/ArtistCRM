import {
  formatEventDateInput,
  parseEventDateInput,
  serializeEventTasks,
  validateEventDates,
  type EventTaskDraft,
} from './eventForm'

const task = (overrides: Partial<EventTaskDraft> = {}): EventTaskDraft => ({
  localKey: 'task-1',
  title: 'Перезвонить',
  dateInput: '2026-08-01 12:00',
  done: false,
  ...overrides,
})

describe('event form dates', () => {
  it('parses valid local input and rejects incomplete values', () => {
    expect(parseEventDateInput('2026-08-15 18:30')).toMatch(/^2026-08-15T/)
    expect(parseEventDateInput('2026-08-15')).toBeUndefined()
    expect(parseEventDateInput('2026-02-30 18:30')).toBeUndefined()
    expect(parseEventDateInput('')).toBeNull()
  })

  it('formats ISO value without shifting the displayed local time', () => {
    const source = new Date(2026, 7, 15, 18, 30).toISOString()
    expect(formatEventDateInput(source)).toBe('2026-08-15 18:30')
  })

  it('validates the end date and every contact task', () => {
    expect(validateEventDates({
      eventDate: '2026-08-15 18:00',
      dateEnd: '2026-08-15 17:00',
      depositDueAt: '',
      tasks: [],
    })).toBe('Дата окончания не может быть раньше даты начала')
    expect(validateEventDates({
      eventDate: '',
      dateEnd: '',
      depositDueAt: '',
      tasks: [task({ title: '' })],
    })).toBe('У каждого следующего контакта должно быть название')
  })

  it('serializes task state for the sync payload', () => {
    expect(serializeEventTasks([task({ _id: 'server-task', description: '  После сметы  ' })]))
      .toEqual([expect.objectContaining({
        _id: 'server-task',
        title: 'Перезвонить',
        description: 'После сметы',
        done: false,
      })])
  })
})
