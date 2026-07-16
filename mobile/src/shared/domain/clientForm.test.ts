import {
  formatSignificantDateInput,
  parseSignificantDateInput,
  serializeSignificantDates,
  validateSignificantDates,
  type SignificantDateDraft,
} from './clientForm'

const draft = (overrides: Partial<SignificantDateDraft> = {}): SignificantDateDraft => ({
  localKey: 'date-1',
  title: 'День рождения',
  dateInput: '1990-05-20',
  comment: '',
  ...overrides,
})

describe('client significant dates', () => {
  it('parses real calendar dates only', () => {
    expect(parseSignificantDateInput('1990-05-20')).toMatch(/^1990-05-20T/)
    expect(parseSignificantDateInput('2026-02-30')).toBeUndefined()
    expect(parseSignificantDateInput('')).toBeNull()
  })

  it('formats an ISO date as the same local calendar day', () => {
    const source = new Date(1990, 4, 20, 12).toISOString()
    expect(formatSignificantDateInput(source)).toBe('1990-05-20')
  })

  it('requires a title for a non-empty row and trims the payload', () => {
    expect(validateSignificantDates([draft({ title: '' })]))
      .toBe('Укажите название значимой даты')
    expect(serializeSignificantDates([draft({ title: '  Годовщина  ', comment: '  Напомнить  ' })]))
      .toEqual([expect.objectContaining({ title: 'Годовщина', comment: 'Напомнить' })])
  })
})
