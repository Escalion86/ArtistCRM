import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeMobileProfilePatch,
  serializeMobileProfile,
} from './profile.js'

test('mobile profile нормализует контакты и игнорирует служебные поля', () => {
  const result = normalizeMobileProfilePatch({
    firstName: '  Анна  ',
    email: ' USER@EXAMPLE.COM ',
    whatsapp: '+7 (900) 000-00-01',
    telegram: 'https://t.me/artist_name/',
    vk: '@artist_vk',
    tenantId: 'another-tenant',
    password: 'must-not-change',
  })
  assert.equal(result.error, '')
  assert.deepEqual(result.update, {
    firstName: 'Анна',
    email: 'user@example.com',
    whatsapp: 79000000001,
    telegram: 'artist_name',
    vk: 'artist_vk',
  })
  assert.equal('tenantId' in result.update, false)
  assert.equal('password' in result.update, false)
})

test('mobile profile serializer возвращает контакты без password и OAuth данных', () => {
  const result = serializeMobileProfile({
    _id: 'user-id',
    tenantId: 'tenant-id',
    firstName: 'Анна',
    whatsapp: 79000000001,
    telegram: 'artist',
    password: 'hash',
    googleCalendar: { refreshToken: 'oauth-secret' },
  })
  assert.equal(result.whatsapp, '79000000001')
  assert.equal(result.telegram, 'artist')
  const json = JSON.stringify(result)
  assert.equal(json.includes('hash'), false)
  assert.equal(json.includes('oauth-secret'), false)
})
