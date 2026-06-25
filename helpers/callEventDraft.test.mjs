import test from 'node:test'
import assert from 'node:assert/strict'
import { canOpenCallEventDraft } from './callEventDraft.mjs'

test('allows manual event draft from call without transcript', () => {
  assert.equal(
    canOpenCallEventDraft({
      _id: 'call-1',
      recordingUrl: 'https://example.com/recording.mp3',
      transcript: '',
      aiSummary: '',
    }),
    true
  )
})

test('does not allow event draft without call id', () => {
  assert.equal(
    canOpenCallEventDraft({
      recordingUrl: 'https://example.com/recording.mp3',
      transcript: '',
      aiSummary: '',
    }),
    false
  )
})
