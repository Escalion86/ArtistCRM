import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildContractClientCandidates,
  hasContractClientRequisites,
} from './contractClientCandidates.js'

const clientWithRequisites = (extra = {}) => ({
  _id: 'client-1',
  firstName: 'Иван',
  secondName: 'Иванов',
  inn: '123',
  bankName: 'Банк',
  bik: '044525000',
  checkingAccount: '40702810100000000001',
  correspondentAccount: '30101810400000000225',
  legalAddress: 'Москва',
  ...extra,
})

test('hasContractClientRequisites requires bank and legal fields', () => {
  assert.equal(hasContractClientRequisites(clientWithRequisites()), true)
  assert.equal(
    hasContractClientRequisites(
      clientWithRequisites({ checkingAccount: '' })
    ),
    false
  )
})

test('buildContractClientCandidates includes main and other contact clients with requisites', () => {
  const candidates = buildContractClientCandidates({
    clients: [
      clientWithRequisites({ _id: 'main', firstName: 'Анна' }),
      clientWithRequisites({ _id: 'other', firstName: 'Олег' }),
      clientWithRequisites({ _id: 'without', firstName: 'Петр', inn: '' }),
    ],
    eventClientId: 'main',
    otherContacts: [
      { clientId: 'other', comment: 'Организатор' },
      { clientId: 'without', comment: 'Без реквизитов' },
    ],
  })

  assert.deepEqual(
    candidates.map((item) => ({
      id: item.client._id,
      source: item.source,
      comment: item.comment,
    })),
    [
      { id: 'main', source: 'main', comment: '' },
      { id: 'other', source: 'other', comment: 'Организатор' },
    ]
  )
})

test('buildContractClientCandidates removes duplicate clients', () => {
  const candidates = buildContractClientCandidates({
    clients: [clientWithRequisites({ _id: 'main' })],
    eventClientId: 'main',
    otherContacts: [{ clientId: 'main', comment: 'Дубль' }],
  })

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].source, 'main')
})
