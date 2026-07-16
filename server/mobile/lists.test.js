import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMobileStringList } from './lists.js'

test('нормализует пользовательский список без пустых значений и дублей', () => {
  assert.deepEqual(
    normalizeMobileStringList([' Москва ', 'москва', '', null, 'Красноярск']),
    ['Красноярск', 'Москва']
  )
})

test('ограничивает размер и длину элементов списка', () => {
  assert.deepEqual(
    normalizeMobileStringList(['123456', 'Второй'], { limit: 1, maxLength: 4 }),
    ['1234']
  )
})
