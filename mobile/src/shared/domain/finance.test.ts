import { buildEventPaymentControl, parseTransactionDateInput, summarizeTransactions } from './finance'
import type { Event, Transaction } from './types'

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  _id: Math.random().toString(), amount: 100, type: 'income', ...overrides,
})

describe('mobile finance calculations', () => {
  it('does not include obligations in actual income or expenses', () => {
    expect(summarizeTransactions([
      transaction({ amount: 500, type: 'income' }),
      transaction({ amount: 200, type: 'expense' }),
      transaction({ amount: 300, type: 'income', paymentMethod: 'obligation' }),
    ])).toEqual({ income: 500, expense: 200, obligation: 300 })
  })

  it('calculates deposit and contract balances from actual event transactions', () => {
    const event: Event = {
      _id: 'event-1', status: 'active', contractSum: 1000,
      waitDeposit: true, depositExpectedAmount: 300,
    }
    const [row] = buildEventPaymentControl([event], [
      transaction({ eventId: 'event-1', amount: 200, category: 'deposit' }),
      transaction({ eventId: 'event-1', amount: 100, category: 'final_payment', paymentMethod: 'obligation' }),
    ])
    expect(row).toMatchObject({ paid: 200, contractRemaining: 800, depositPaid: 200, depositRemaining: 100, depositPending: true })
  })

  it('does not count tips and referrals as contract payments', () => {
    const event: Event = { _id: 'event-1', status: 'active', contractSum: 1000 }
    const [row] = buildEventPaymentControl([event], [
      transaction({ eventId: 'event-1', amount: 250, category: 'tips' }),
      transaction({ eventId: 'event-1', amount: 100, category: 'referral_in' }),
    ])
    expect(row).toMatchObject({ paid: 0, contractRemaining: 1000 })
  })

  it('validates calendar dates', () => {
    expect(parseTransactionDateInput('2026-07-15')).toMatch(/^2026-07-15T/)
    expect(parseTransactionDateInput('2026-02-30')).toBeUndefined()
  })
})
