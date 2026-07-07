import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildServiceDeleteBlockedText,
  buildServiceDeleteConfirmText,
} from './serviceDeleteCheck.js'

test('buildServiceDeleteConfirmText says service has no event links', () => {
  assert.equal(
    buildServiceDeleteConfirmText(),
    'Связи с мероприятиями нет, поэтому услугу можно удалить без проблем.\n\nВы уверены, что хотите удалить услугу?'
  )
})

test('buildServiceDeleteBlockedText says service is used in events', () => {
  assert.equal(
    buildServiceDeleteBlockedText(5),
    'Удалить услугу нельзя, так как она используется в 5 мероприятиях.'
  )
})
