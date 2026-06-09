import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getCallActionButtonState } from './callActionButtonState.mjs'

describe('getCallActionButtonState', () => {
  it('shows loading state only for the active action on the active call', () => {
    const state = getCallActionButtonState({
      activeAction: { callId: 'call-1', type: 'processRecording' },
      callId: 'call-1',
      type: 'processRecording',
      idleLabel: 'Распознать запись',
      loadingLabel: 'Распознается...',
    })

    assert.equal(state.isLoading, true)
    assert.equal(state.disabled, true)
    assert.equal(state.label, 'Распознается...')
  })

  it('keeps other actions clickable while one call action is running', () => {
    const state = getCallActionButtonState({
      activeAction: { callId: 'call-1', type: 'processRecording' },
      callId: 'call-1',
      type: 'createEvent',
      idleLabel: 'Создать заявку',
      loadingLabel: 'Создается...',
    })

    assert.equal(state.isLoading, false)
    assert.equal(state.disabled, false)
    assert.equal(state.label, 'Создать заявку')
  })

  it('preserves existing disabled state when there is no matching active action', () => {
    const state = getCallActionButtonState({
      activeAction: null,
      callId: 'call-1',
      type: 'createEvent',
      idleLabel: 'Создать заявку',
      loadingLabel: 'Создается...',
      disabled: true,
    })

    assert.equal(state.isLoading, false)
    assert.equal(state.disabled, true)
    assert.equal(state.label, 'Создать заявку')
  })
})
