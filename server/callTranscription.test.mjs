import test from 'node:test'
import assert from 'node:assert/strict'
import { isCallTranscriptionConfigured } from './callTranscription.js'

test('detects configured AITunnel transcription from tenant settings', () => {
  assert.equal(
    isCallTranscriptionConfigured({
      aiTranscriptionProvider: 'aitunnel',
      aitunnelKey: 'tenant-api-key',
    }),
    true
  )
})

test('returns false when transcription API key is missing', () => {
  const previousKey = process.env.AITUNNEL_KEY
  const previousProvider = process.env.AI_TRANSCRIPTION_PROVIDER
  delete process.env.AITUNNEL_KEY
  delete process.env.AI_TRANSCRIPTION_PROVIDER

  try {
    assert.equal(
      isCallTranscriptionConfigured({
        aiTranscriptionProvider: 'aitunnel',
        aitunnelKey: '',
      }),
      false
    )
  } finally {
    if (previousKey === undefined) delete process.env.AITUNNEL_KEY
    else process.env.AITUNNEL_KEY = previousKey
    if (previousProvider === undefined) delete process.env.AI_TRANSCRIPTION_PROVIDER
    else process.env.AI_TRANSCRIPTION_PROVIDER = previousProvider
  }
})

test('returns false for unsupported transcription provider', () => {
  assert.equal(
    isCallTranscriptionConfigured({
      aiTranscriptionProvider: 'unknown-provider',
      aitunnelKey: 'tenant-api-key',
    }),
    false
  )
})
