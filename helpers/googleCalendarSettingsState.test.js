import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldSaveGoogleCalendarSettingsBeforeSync } from './googleCalendarSettingsState.js'

test('requires saving before sync when status sync conditions changed', () => {
  assert.equal(
    shouldSaveGoogleCalendarSettingsBeforeSync({
      remindersChanged: false,
      statusColorsChanged: true,
      syncSettingsChanged: false,
    }),
    true
  )
})

test('does not require saving before sync when settings are unchanged', () => {
  assert.equal(
    shouldSaveGoogleCalendarSettingsBeforeSync({
      remindersChanged: false,
      statusColorsChanged: false,
      syncSettingsChanged: false,
    }),
    false
  )
})
