import { formatBalanceRunway, formatBillingDate, formatRubles } from './format'

describe('mobile billing format', () => {
  it('форматирует баланс и дату прогноза', () => {
    expect(formatRubles(800)).toContain('800')
    expect(formatBillingDate('2026-10-25T00:00:00.000Z')).toBe('25.10.2026')
    expect(
      formatBalanceRunway({
        account: {
          balance: 800,
          billingStatus: 'active',
          tariffActiveUntil: null,
          nextChargeAt: null,
          fundedMonths: 2,
          fundedUntil: '2026-10-25T00:00:00.000Z',
          unlimited: false,
        },
        currentTariff: null,
        tariffs: [],
      })
    ).toContain('хватит до 25.10.2026')
  })
})
