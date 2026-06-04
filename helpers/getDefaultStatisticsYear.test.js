import test from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultStatisticsYear } from './getDefaultStatisticsYear.js'

test('returns current year when it is available', () => {
  assert.equal(
    getDefaultStatisticsYear([2027, 2026, 2025], { currentYear: 2026 }),
    2026
  )
})

test('returns first available year when current year is missing', () => {
  assert.equal(
    getDefaultStatisticsYear([2027, 2025, 2024], { currentYear: 2026 }),
    2027
  )
})

test('returns null for empty list', () => {
  assert.equal(getDefaultStatisticsYear([], { currentYear: 2026 }), null)
})
