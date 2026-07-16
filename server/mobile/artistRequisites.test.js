import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildArtistRequisitesUpdate,
  normalizeMobileArtistRequisites,
  serializeMobileArtistRequisites,
} from './artistRequisites.js'

test('реквизиты артиста нормализуются без остальных SiteSettings.custom', () => {
  const result = normalizeMobileArtistRequisites({
    artistStatus: 'self_employed',
    artistFullName: '  Иванов Иван Иванович ',
    artistOgrnip: '123-456',
    artistInn: '123 456 789 012',
    artistBik: '044 525 225',
  }, {
    contractArtistBankName: 'Банк',
    avitoClientSecret: 'must-not-leak',
  })
  assert.equal(result.artistStatus, 'self_employed')
  assert.equal(result.artistFullName, 'Иванов Иван Иванович')
  assert.equal(result.artistOgrnip, '')
  assert.equal(result.artistInn, '123456789012')
  assert.equal(result.artistBik, '044525225')
  assert.equal(result.artistBankName, 'Банк')
  assert.equal(JSON.stringify(result).includes('must-not-leak'), false)
})

test('update реквизитов содержит только разрешённые custom paths', () => {
  const safe = serializeMobileArtistRequisites({
    contractArtistFullName: 'Артист',
    contractArtistInn: '123456789012',
  })
  const update = buildArtistRequisitesUpdate(safe)
  assert.equal(update['custom.contractArtistFullName'], 'Артист')
  assert.equal(update['custom.contractArtistInn'], '123456789012')
  assert.equal(Object.keys(update).every((key) => key.startsWith('custom.contractArtist')), true)
})
