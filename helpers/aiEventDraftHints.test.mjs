import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyAiEventDraftHints,
  getAiEventDraftHints,
} from './aiEventDraftHints.mjs'

const NOW = new Date('2026-08-09T03:00:00.000Z')

test('разбирает регрессионный пример со свадьбой, адресом и полуднем', () => {
  const hints = getAiEventDraftHints(
    'Завтра на линейной 38 от Ларковича за свадебное',
    { now: NOW, timeZone: 'Asia/Krasnoyarsk' }
  )

  assert.equal(hints.eventType, 'Свадьба')
  assert.equal(hints.eventDate, '2026-08-10T05:00:00.000Z')
  assert.deepEqual(hints.address, { street: 'Линейная', house: '38' })
})

test('не принимает номер дома за сумму', () => {
  const result = applyAiEventDraftHints(
    { contractSum: 30000, description: 'Исходный текст' },
    'Завтра на линейной 38 от Ларковича за свадебное',
    { now: NOW, timeZone: 'Asia/Krasnoyarsk' }
  )

  assert.equal(result.contractSum, undefined)
  assert.equal(result.eventType, 'Свадьба')
})

test('сохраняет сумму при явном денежном контексте', () => {
  const result = applyAiEventDraftHints(
    { contractSum: 30000 },
    'Завтра свадьба, гонорар 30000 рублей',
    { now: NOW, timeZone: 'Asia/Krasnoyarsk' }
  )

  assert.equal(result.contractSum, 30000)
})

test('использует явно указанное время вместо полудня', () => {
  const hints = getAiEventDraftHints('Завтра свадьба в 16:30', {
    now: NOW,
    timeZone: 'Asia/Krasnoyarsk',
  })

  assert.equal(hints.eventDate, '2026-08-10T09:30:00.000Z')
})

