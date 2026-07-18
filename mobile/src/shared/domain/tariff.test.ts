import { getTariffDisplayName } from './tariff'

describe('tariff helpers', () => {
  it('показывает название тарифа и безопасные fallback', () => {
    expect(getTariffDisplayName({ tariffTitle: ' Профи ' })).toBe('Профи')
    expect(getTariffDisplayName({ tariffId: 'tariff-id' })).toBe(
      'название уточняется'
    )
    expect(getTariffDisplayName(null)).toBe('не выбран')
  })
})
