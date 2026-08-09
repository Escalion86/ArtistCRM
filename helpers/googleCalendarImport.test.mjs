import assert from 'node:assert/strict'
import test from 'node:test'
import {
  chooseGoogleImportAddress,
  getGoogleImportEstimateRub,
  getGoogleImportDates,
  normalizeGoogleImportAiFields,
  normalizeGoogleImportRange,
  serializeGoogleImportCandidate,
} from './googleCalendarImport.mjs'

test('ограничивает период импорта одним годом', () => {
  assert.throws(
    () => normalizeGoogleImportRange('2026-01-01', '2027-01-03'),
    /не более 366 дней/
  )
})

test('Google location имеет приоритет над адресом из описания', () => {
  assert.deepEqual(
    chooseGoogleImportAddress({
      calendarLocation: 'Москва, Тверская 1',
      calendarAddress: { town: 'Москва', street: 'Тверская', house: '1' },
      aiAddress: { town: 'Красноярск', street: 'Линейная', house: '38' },
    }),
    { town: 'Москва', street: 'Тверская', house: '1' }
  )
})

test('использует адрес из описания при пустой Google location', () => {
  assert.deepEqual(
    chooseGoogleImportAddress({
      calendarLocation: '',
      calendarAddress: {},
      aiAddress: { street: 'Линейная', house: '38' },
    }),
    { street: 'Линейная', house: '38' }
  )
})

test('кандидат сообщает, требуется ли платный AI-анализ', () => {
  const candidate = serializeGoogleImportCandidate({
    id: 'google-1',
    summary: 'Свадьба',
    description: 'Клиент Анна',
    start: { dateTime: '2026-09-01T12:00:00+07:00' },
    end: { dateTime: '2026-09-01T14:00:00+07:00' },
  })
  assert.equal(candidate.needsAi, true)
  assert.equal(candidate.allDay, false)
})

test('событие на весь день импортируется на полдень по часовому поясу', () => {
  const dates = getGoogleImportDates(
    { start: { date: '2026-09-01' }, end: { date: '2026-09-02' } },
    { timeZone: 'Asia/Krasnoyarsk', defaultDurationMinutes: 90 }
  )
  assert.equal(dates.eventDate.toISOString(), '2026-09-01T05:00:00.000Z')
  assert.equal(dates.dateEnd.toISOString(), '2026-09-01T06:30:00.000Z')
  assert.equal(dates.allDay, true)
})

test('нормализует AI-поля и отбрасывает неизвестные услуги', () => {
  assert.deepEqual(
    normalizeGoogleImportAiFields(
      {
        eventType: ' Свадьба ',
        contractSum: '30000',
        servicesIds: ['service-1', 'invalid'],
        eventDate: '2030-01-01',
      },
      ['service-1']
    ),
    {
      eventType: 'Свадьба',
      contractSum: 30000,
      servicesIds: ['service-1'],
    }
  )
})

test('считает ориентировочную стоимость выбранных описаний', () => {
  assert.equal(getGoogleImportEstimateRub(12, 0.53), 6.36)
})
