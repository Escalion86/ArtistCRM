import type { Event, Transaction } from '../../shared/domain/types'
import {
  getEventCardAttention,
  getEventCardFinance,
  getEventCardStatus,
  getEventCardTitle,
} from './eventCard'

const event = (values: Partial<Event> = {}): Event => ({
  _id: 'event-1',
  status: 'active',
  eventType: 'Свадьба',
  ...values,
})

const transaction = (values: Partial<Transaction> = {}): Transaction => ({
  _id: 'transaction-1',
  eventId: 'event-1',
  amount: 0,
  type: 'income',
  ...values,
})

describe('event card presentation', () => {
  it('собирает заголовок как в PWA из типа и услуг', () => {
    expect(
      getEventCardTitle(event(), [
        { _id: 'service-1', title: 'Ведение' },
        { _id: 'service-2', title: 'Аппаратура' },
      ])
    ).toBe('Свадьба • Ведение, Аппаратура')
  })

  it('показывает завершённое активное мероприятие нейтральным статусом', () => {
    expect(
      getEventCardStatus(
        event({ eventDate: '2026-07-20T10:00:00+07:00' }),
        new Date('2026-07-21T10:00:00+07:00')
      )
    ).toMatchObject({ label: 'Завершено', marker: 'neutral' })
  })

  it('не считает обязательства фактической оплатой', () => {
    const result = getEventCardFinance(event({ contractSum: 30_000 }), [
      transaction({ amount: 10_000, category: 'deposit' }),
      transaction({ amount: 5_000, paymentMethod: 'obligation' }),
      transaction({ amount: 2_000, type: 'expense' }),
    ])
    expect(result).toMatchObject({ paid: 10_000, expense: 2_000, net: 8_000 })
  })

  it('ставит просроченный задаток выше следующего контакта', () => {
    const result = getEventCardAttention(
      event({
        waitDeposit: true,
        depositExpectedAmount: 5_000,
        depositDueAt: '2026-07-20T10:00:00+07:00',
        additionalEvents: [
          { title: 'Позвонить', date: '2026-07-22T10:00:00+07:00' },
        ],
      }),
      [],
      new Date('2026-07-21T10:00:00+07:00')
    )
    expect(result).toMatchObject({ tone: 'danger', hiddenCount: 1 })
    expect(result?.label).toContain('Просрочен задаток')
  })
})
