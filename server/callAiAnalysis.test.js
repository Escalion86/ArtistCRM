import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAiCallAnalysis } from './callAiAnalysis.js'

test('normalizes all event draft fields extracted from a call', () => {
  const result = normalizeAiCallAnalysis(
    {
      eventType: 'Корпоратив',
      eventDate: '2023-12-18T12:00:00.000Z',
      dateEnd: '2023-12-18T14:00:00.000Z',
      budget: 100000,
      waitDeposit: true,
      depositDueAt: '2023-08-24T12:00:00.000Z',
      depositExpectedAmount: 5000,
      serviceTitle: 'стандартная',
    },
    {
      transcript:
        'Нужен фокусник 18 декабря на 2 часа. Стандартная программа. Задаток в ближайшие пару дней 5 тысяч.',
      referenceDate: '2026-08-22T05:00:00.000Z',
      eventTypes: ['Корпоратив'],
      services: ['Стандартная программа'],
    }
  )

  assert.equal(result.extractedFields.eventDate.getUTCFullYear(), 2026)
  assert.equal(result.extractedFields.dateEnd.getUTCFullYear(), 2026)
  assert.equal(result.extractedFields.depositDueAt.getUTCFullYear(), 2026)
  assert.equal(result.extractedFields.waitDeposit, true)
  assert.equal(result.extractedFields.depositExpectedAmount, 5000)
  assert.deepEqual(result.extractedFields.serviceTitles, [
    'Стандартная программа',
  ])
})

test('keeps an explicitly stated past year unchanged', () => {
  const result = normalizeAiCallAnalysis(
    { eventDate: '2023-12-18T12:00:00.000Z' },
    {
      transcript: 'Архивное мероприятие было 18 декабря 2023 года.',
      referenceDate: '2026-08-22T05:00:00.000Z',
    }
  )

  assert.equal(result.extractedFields.eventDate.getUTCFullYear(), 2023)
})
