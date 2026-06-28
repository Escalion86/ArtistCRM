import test from 'node:test'
import assert from 'node:assert/strict'

import { getEventTransferDisplay } from './eventTransferDisplay.js'

test('returns colleague display info for transferred event', () => {
  const colleague = {
    _id: 'colleague-1',
    firstName: 'Иван',
    secondName: 'Петров',
    phone: '79000000000',
  }

  assert.deepEqual(
    getEventTransferDisplay(
      { isTransferred: true, colleagueId: 'colleague-1' },
      [colleague]
    ),
    {
      isTransferred: true,
      colleague,
      colleagueName: 'Иван Петров',
      missingColleague: false,
    }
  )
})

test('marks transferred event without colleague as missing colleague', () => {
  assert.deepEqual(
    getEventTransferDisplay({ isTransferred: true, colleagueId: null }, []),
    {
      isTransferred: true,
      colleague: null,
      colleagueName: '',
      missingColleague: true,
    }
  )
})

test('does not show transfer info for regular event', () => {
  assert.deepEqual(getEventTransferDisplay({ isTransferred: false }, []), {
    isTransferred: false,
    colleague: null,
    colleagueName: '',
    missingColleague: false,
  })
})
