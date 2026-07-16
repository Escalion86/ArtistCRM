import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeMobileCallResult,
  sanitizeMobileCallPayload,
  serializeMobileCall,
} from './calls.js'

test('serializeMobileCall не выдаёт ключ хранения и ID провайдера', () => {
  const result = serializeMobileCall({
    _id: 'call-1',
    tenantId: 'tenant-secret',
    providerCallId: 'provider-secret',
    recordingStorageKey: 'storage-secret',
    phone: '+7 999 000-00-00',
    transcript: 'Текст разговора',
    aiExtractedFields: { budget: 50000, objections: ['Дорого'] },
  })

  assert.equal(result._id, 'call-1')
  assert.equal(result.phone, '+7 999 000-00-00')
  assert.equal(result.aiExtractedFields.budget, 50000)
  assert.equal('tenantId' in result, false)
  assert.equal('providerCallId' in result, false)
  assert.equal('recordingStorageKey' in result, false)
})

test('normalizeMobileCallResult принимает только пользовательские результаты', () => {
  assert.equal(normalizeMobileCallResult('answered'), 'answered')
  assert.equal(normalizeMobileCallResult('callback'), 'callback')
  assert.equal(normalizeMobileCallResult('admin_override'), null)
})

test('sanitizeMobileCallPayload очищает вложенный ответ создания заявки', () => {
  const result = sanitizeMobileCallPayload({
    success: true,
    data: {
      call: { _id: 'call-1', raw: { secret: true } },
      event: { _id: 'event-1', clientId: 'client-1', documents: ['secret'] },
      url: '/cabinet/secret',
    },
  })

  assert.equal('raw' in result.data.call, false)
  assert.deepEqual(result.data.event, {
    _id: 'event-1',
    clientId: 'client-1',
    status: '',
  })
  assert.equal('url' in result.data, false)
})
