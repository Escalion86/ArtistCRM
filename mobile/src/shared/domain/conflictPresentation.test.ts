import {
  formatConflictValue,
  getConflictEntityLabel,
  getConflictFieldLabel,
} from './conflictPresentation'

describe('conflictPresentation', () => {
  it('показывает пользовательские названия сущности, поля и статуса', () => {
    expect(getConflictEntityLabel('events')).toBe('Мероприятие')
    expect(getConflictFieldLabel('contractSum')).toBe('Сумма договора')
    expect(formatConflictValue('status', 'active')).toBe('Подтверждено')
  })

  it('форматирует сумму и date-only без UTC-смещения', () => {
    expect(formatConflictValue('contractSum', 60000)).toContain('60')
    expect(formatConflictValue('date', '2026-08-20')).toBe('20.08.2026')
  })

  it('заменяет ID клиентов и услуг понятными именами в массивах', () => {
    const labels = { client1: 'Анна Иванова', service1: 'Ведение свадьбы' }
    expect(formatConflictValue('clientId', 'client1', labels)).toBe(
      'Анна Иванова'
    )
    expect(formatConflictValue('servicesIds', ['service1'], labels)).toBe(
      '1. Ведение свадьбы'
    )
    expect(
      formatConflictValue(
        'otherContacts',
        [{ clientId: 'client1', comment: 'Организатор' }],
        labels
      )
    ).toBe('1. Анна Иванова · Организатор')
  })
})
