import test from 'node:test'
import assert from 'node:assert/strict'
import { getCallRecordingNotificationState } from './callRecordingPrompt.mjs'

test('asks to create event when transcript already exists', () => {
  const state = getCallRecordingNotificationState({
    call: {
      _id: 'call-1',
      recordingUrl: 'https://example.com/recording.mp3',
      transcript: 'Клиент подтвердил дату мероприятия',
    },
    phoneLabel: '+7 999 111-22-33',
    canAutoCreateEventFromRecording: false,
  })

  assert.equal(state.kind, 'create_event_prompt')
  assert.equal(state.body, 'Звонок с +7 999 111-22-33. Создать заявку из разговора?')
  assert.deepEqual(state.actions, [
    { action: 'create_event', title: 'Да' },
    { action: 'no_event', title: 'Нет' },
  ])
})

test('asks to create event when recording can be transcribed automatically', () => {
  const state = getCallRecordingNotificationState({
    call: {
      _id: 'call-1',
      recordingUrl: 'https://example.com/recording.mp3',
      transcript: '',
    },
    phoneLabel: '',
    canAutoCreateEventFromRecording: true,
  })

  assert.equal(state.kind, 'create_event_prompt')
  assert.equal(state.body, 'Создать заявку из разговора?')
})

test('opens call instead of create decision when AI transcription is unavailable', () => {
  const state = getCallRecordingNotificationState({
    call: {
      _id: 'call-1',
      recordingUrl: 'https://example.com/recording.mp3',
      transcript: '',
    },
    phoneLabel: '+7 999 111-22-33',
    canAutoCreateEventFromRecording: false,
  })

  assert.equal(state.kind, 'open_call_prompt')
  assert.equal(
    state.body,
    'Звонок с +7 999 111-22-33. Для автоматической заявки подключите ИИ или откройте звонок и заполните заявку вручную.'
  )
  assert.deepEqual(state.actions, [{ action: 'open_call', title: 'Открыть звонок' }])
})

test('does not build notification state without recording url', () => {
  const state = getCallRecordingNotificationState({
    call: {
      _id: 'call-1',
      recordingUrl: '',
      transcript: '',
    },
    canAutoCreateEventFromRecording: true,
  })

  assert.equal(state, null)
})
