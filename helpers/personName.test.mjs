import test from 'node:test'
import assert from 'node:assert/strict'
import getPersonFullName from './getPersonFullName.js'
import { buildSingleNamePatch } from './personName.mjs'

test('legacy names retain their order and do not duplicate on repeated saves', () => {
  const old = {
    firstName: 'Анна',
    secondName: 'Иванова-Петрова',
    thirdName: 'Олеговна',
  }
  const full = getPersonFullName(old)
  const saved = buildSingleNamePatch(full)
  assert.equal(getPersonFullName(saved), full)
  assert.deepEqual(buildSingleNamePatch(getPersonFullName(saved)), saved)
  assert.equal(saved.secondName, '')
  assert.equal(saved.thirdName, '')
})

test('single field preserves compound names and optional patronymics', () => {
  for (const value of [
    'Анна',
    'Анна Мария де Соуза',
    'Иванов Пётр',
    'Иванов Пётр Иванович',
  ]) {
    assert.equal(buildSingleNamePatch(`  ${value}  `).firstName, value)
  }
  assert.equal(buildSingleNamePatch('   ').firstName, '')
})
