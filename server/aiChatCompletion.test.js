import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAiAnalysisProviderConfig,
  requestAiChatCompletion,
} from './aiChatCompletion.js'

test('DeepSeek использует пользовательский ключ и актуальную модель по умолчанию', () => {
  const config = getAiAnalysisProviderConfig({
    aiAnalysisProvider: 'deepseek',
    deepseekKey: 'tenant-deepseek-key',
  })

  assert.equal(config.name, 'deepseek')
  assert.equal(config.apiKey, 'tenant-deepseek-key')
  assert.equal(config.model, 'deepseek-v4-flash')
  assert.equal(config.apiUrl, 'https://api.deepseek.com/chat/completions')
})

test('личный AITunnel не использует общий серверный ключ', () => {
  const originalKey = process.env.AITUNNEL_KEY
  process.env.AITUNNEL_KEY = 'shared-platform-key'
  try {
    const personal = getAiAnalysisProviderConfig({
      aiAnalysisProvider: 'aitunnel',
    })
    const platform = getAiAnalysisProviderConfig({
      aiAnalysisProvider: 'artistcrm',
    })

    assert.equal(personal.apiKey, '')
    assert.equal(platform.apiKey, 'shared-platform-key')
  } finally {
    if (originalKey === undefined) delete process.env.AITUNNEL_KEY
    else process.env.AITUNNEL_KEY = originalKey
  }
})

test('выключенная пользовательская интеграция не вызывает внешний AI', async () => {
  const originalFetch = global.fetch
  let fetchCalled = false
  global.fetch = async () => {
    fetchCalled = true
    throw new Error('fetch не должен вызываться')
  }

  try {
    const result = await requestAiChatCompletion({
      settings: {
        aiIntegrationEnabled: false,
        aiAnalysisProvider: 'deepseek',
        deepseekKey: 'tenant-deepseek-key',
      },
      messages: [{ role: 'user', content: 'Тест' }],
    })
    assert.equal(result, null)
    assert.equal(fetchCalled, false)
  } finally {
    global.fetch = originalFetch
  }
})

test('DeepSeek V4 получает JSON-режим с отключённым thinking', async () => {
  const originalFetch = global.fetch
  let requestBody = null
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body)
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const result = await requestAiChatCompletion({
      settings: {
        aiAnalysisProvider: 'deepseek',
        deepseekKey: 'tenant-deepseek-key',
      },
      messages: [{ role: 'user', content: 'Верни JSON' }],
    })
    assert.equal(result.provider, 'deepseek')
    assert.deepEqual(requestBody.response_format, { type: 'json_object' })
    assert.deepEqual(requestBody.thinking, { type: 'disabled' })
  } finally {
    global.fetch = originalFetch
  }
})
