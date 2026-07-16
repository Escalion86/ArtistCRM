import assert from 'node:assert/strict'
import test from 'node:test'
import { serializeMobileProviderIntegration } from './providerIntegrations.js'

test('mobile Avito status не содержит client secret и webhook token', () => {
  const result = serializeMobileProviderIntegration({
    provider: 'avito',
    available: true,
    settings: {
      enabled: true,
      clientId: 'client-id',
      clientSecret: 'client-secret',
      userId: 'account-id',
      webhookToken: 'webhook-token',
      webhookUrl: 'https://example.test/webhook/webhook-token',
      status: 'connected',
    },
  })
  assert.equal(result.configured, true)
  assert.equal(result.clientId, 'client-id')
  assert.equal(result.accountId, 'account-id')
  const json = JSON.stringify(result)
  assert.equal(json.includes('client-secret'), false)
  assert.equal(json.includes('webhook-token'), false)
})

test('mobile VK status не содержит access token, confirmation и webhook secret', () => {
  const result = serializeMobileProviderIntegration({
    provider: 'vk',
    available: true,
    settings: {
      enabled: true,
      groupId: 'group-id',
      accessToken: 'vk-access-token',
      confirmationCode: 'confirmation-secret',
      webhookSecret: 'webhook-secret',
      status: 'connected',
    },
  })
  assert.equal(result.configured, true)
  assert.equal(result.accountId, 'group-id')
  const json = JSON.stringify(result)
  assert.equal(json.includes('vk-access-token'), false)
  assert.equal(json.includes('confirmation-secret'), false)
  assert.equal(json.includes('webhook-secret'), false)
})

test('mobile Novofon status скрывает API key и webhook secret', () => {
  const result = serializeMobileProviderIntegration({
    provider: 'telephony',
    available: true,
    settings: {
      enabled: true,
      apiKey: 'novofon-api-secret',
      webhookSecret: 'novofon-webhook-secret',
    },
  })
  assert.equal(result.configured, true)
  assert.equal(result.hasApiKey, true)
  assert.equal(result.status, 'connected')
  const json = JSON.stringify(result)
  assert.equal(json.includes('novofon-api-secret'), false)
  assert.equal(json.includes('novofon-webhook-secret'), false)
})

test('mobile AITunnel status скрывает ключ и оставляет модели', () => {
  const result = serializeMobileProviderIntegration({
    provider: 'ai',
    available: true,
    settings: {
      enabled: true,
      key: 'aitunnel-secret',
      transcriptionProvider: 'aitunnel',
      transcriptionModel: 'whisper-1',
      analysisProvider: 'aitunnel',
      analysisModel: 'gpt-4o-mini',
    },
  })
  assert.equal(result.configured, true)
  assert.equal(result.transcriptionModel, 'whisper-1')
  assert.equal(result.analysisModel, 'gpt-4o-mini')
  assert.equal(JSON.stringify(result).includes('aitunnel-secret'), false)
})

test('mobile Public Leads показывает только metadata и последние четыре символа', () => {
  const result = serializeMobileProviderIntegration({
    provider: 'public-leads',
    available: true,
    settings: {
      enabled: true,
      endpoint: 'https://artistcrm.test/api/public/lead',
      keys: [{
        id: 'site',
        name: 'Сайт',
        key: 'lead_full_secret_1234',
        enabled: true,
      }],
    },
  })
  assert.equal(result.configured, true)
  assert.equal(result.keys[0].lastFour, '1234')
  assert.equal(result.keys[0].name, 'Сайт')
  assert.equal(JSON.stringify(result).includes('lead_full_secret_1234'), false)
})
