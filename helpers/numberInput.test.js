import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adjustNumberByStep,
  normalizeDecimalInputString,
} from './numberInput.js'

test('normalizes decimal input without dropping a trailing separator', () => {
  assert.equal(normalizeDecimalInputString('1,'), '1.')
  assert.equal(normalizeDecimalInputString('01,50'), '1.50')
  assert.equal(
    normalizeDecimalInputString('9.876', { maxFractionDigits: 2 }),
    '9.87'
  )
})

test('adjusts decimal values without floating point artifacts', () => {
  assert.equal(
    adjustNumberByStep('9.88', {
      step: 0.01,
      direction: 1,
      min: 1,
      max: 10,
      fractionDigits: 2,
    }),
    9.89
  )
  assert.equal(
    adjustNumberByStep('9.99', {
      step: 0.01,
      direction: 1,
      min: 1,
      max: 10,
      fractionDigits: 2,
    }),
    10
  )
  assert.equal(
    adjustNumberByStep('1', {
      step: 0.01,
      direction: -1,
      min: 1,
      max: 10,
      fractionDigits: 2,
    }),
    1
  )

  let repeatedValue = 1.5
  for (let index = 0; index < 839; index += 1) {
    repeatedValue = adjustNumberByStep(repeatedValue, {
      step: 0.01,
      direction: 1,
      min: 1,
      max: 10,
      fractionDigits: 2,
    })
  }
  assert.equal(repeatedValue, 9.89)
  assert.equal(String(repeatedValue), '9.89')
})
