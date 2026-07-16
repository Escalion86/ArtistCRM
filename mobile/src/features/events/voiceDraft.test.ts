import { applyVoiceDraftFields, countApplicableVoiceDraftFields, type VoiceDraftFormValues } from './voiceDraft'

const current: VoiceDraftFormValues = {
  eventType: 'Корпоратив',
  description: 'Старое описание',
  eventDate: '',
  dateEnd: '',
  clientId: 'client-old',
  town: 'Красноярск',
  street: '',
  house: '',
  contractSum: '',
  waitDeposit: false,
  depositExpectedAmount: '',
}

describe('mobile voice event draft', () => {
  it('applies only valid recognized fields and keeps missing values', () => {
    expect(applyVoiceDraftFields(current, {
      eventType: ' Свадьба ',
      eventDate: '2026-08-15T18:30:00+07:00',
      contractSum: 50_000.4,
      depositExpectedAmount: 10_000,
      address: { town: ' Сосновоборск ', street: 'Весенняя', house: '12' },
    }, new Set())).toMatchObject({
      eventType: 'Свадьба',
      description: 'Старое описание',
      eventDate: '2026-08-15 18:30',
      contractSum: '50000',
      waitDeposit: true,
      depositExpectedAmount: '10000',
      town: 'Сосновоборск',
      street: 'Весенняя',
      house: '12',
    })
  })

  it('does not accept an unknown client or invalid amounts and dates', () => {
    expect(applyVoiceDraftFields(current, {
      clientId: 'foreign-client',
      contractSum: -10,
      depositExpectedAmount: Number.NaN,
      eventDate: 'invalid-date',
    }, new Set(['client-known']))).toEqual(current)
  })

  it('applies only a client present in the local tenant cache', () => {
    expect(applyVoiceDraftFields(current, { clientId: 'client-known' }, new Set(['client-known'])).clientId)
      .toBe('client-known')
  })

  it('counts fields available for explicit preview confirmation', () => {
    expect(countApplicableVoiceDraftFields({
      eventType: 'Свадьба',
      eventDate: '2026-08-15',
      contractSum: 50_000,
      address: { town: 'Красноярск', street: '', house: null },
    })).toBe(4)
  })
})
