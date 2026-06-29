import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getEventTransferDisplay,
  getEventExtraContactDisplays,
} from './eventTransferDisplay.js'

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

test('builds extra contact list without main client and duplicate contacts', () => {
  const mainClient = {
    _id: 'client-1',
    firstName: 'Мария',
    secondName: 'Соколова',
  }
  const colleague = {
    _id: 'colleague-1',
    firstName: 'Иван',
    secondName: 'Петров',
    phone: '79000000000',
  }
  const otherContact = {
    _id: 'client-2',
    firstName: 'Анна',
    secondName: 'Орлова',
    telegram: 'anna',
  }

  assert.deepEqual(
    getEventExtraContactDisplays(
      {
        clientId: mainClient._id,
        isTransferred: true,
        colleagueId: colleague._id,
        otherContacts: [
          { clientId: mainClient._id, comment: 'Основной клиент дублем' },
          { clientId: otherContact._id, comment: 'Организатор' },
          { clientId: colleague._id, comment: 'Дубль коллеги' },
        ],
      },
      [mainClient, colleague, otherContact]
    ),
    [
      {
        key: 'transferred-colleague-1',
        type: 'transferred',
        label: 'Передано: Иван Петров',
        comment: '',
        client: colleague,
      },
      {
        key: 'other-client-2',
        type: 'other',
        label: 'Анна Орлова',
        comment: 'Организатор',
        client: otherContact,
      },
    ]
  )
})
