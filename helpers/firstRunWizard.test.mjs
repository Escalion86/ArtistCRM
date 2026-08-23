import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FIRST_RUN_WIZARD_COMPLETED_KEY,
  FIRST_RUN_WIZARD_SHOW_TOKEN_KEY,
  SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY,
  buildFirstRunCompletionCustomPatch,
  getFirstRunStatusEducationItems,
  shouldOpenFirstRunWizard,
  shouldShowColleagueTransferControls,
} from './firstRunWizard.mjs'

test('opens first-run wizard for logged user until completed', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: { _id: 'user-1' },
      siteSettings: { custom: {} },
      alreadyShown: false,
    }),
    true
  )
})

test('does not open first-run wizard after completion without manual token', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: { _id: 'user-1' },
      siteSettings: { custom: { [FIRST_RUN_WIZARD_COMPLETED_KEY]: true } },
      alreadyShown: false,
    }),
    false
  )
})

test('manual token opens wizard even when completed', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: { _id: 'user-1' },
      siteSettings: {
        custom: {
          [FIRST_RUN_WIZARD_COMPLETED_KEY]: true,
          [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: 123,
        },
      },
      alreadyShown: false,
    }),
    true
  )
})

test('does not open first-run wizard during developer impersonation', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: {
        _id: 'user-1',
        impersonation: { active: true, originalUserId: 'developer-1' },
      },
      siteSettings: {
        custom: { [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: 123 },
      },
      alreadyShown: false,
    }),
    false
  )
})

test('completion patch preserves custom values and clears manual token', () => {
  assert.deepEqual(
    buildFirstRunCompletionCustomPatch({
      existing: { onboardingActivityPreset: 'events', oldKey: true },
    }),
    {
      onboardingActivityPreset: 'events',
      oldKey: true,
      [FIRST_RUN_WIZARD_COMPLETED_KEY]: true,
      [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: null,
    }
  )
})

test('colleague-transfer controls are hidden by default and visible by setting', () => {
  assert.equal(shouldShowColleagueTransferControls({ custom: {} }), false)
  assert.equal(
    shouldShowColleagueTransferControls({
      custom: { [SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY]: true },
    }),
    true
  )
})

test('status education uses confirmed label for active status', () => {
  const items = getFirstRunStatusEducationItems()
  assert.deepEqual(
    items.map((item) => item.status),
    ['draft', 'active', 'canceled', 'closed']
  )
  assert.equal(
    items.find((item) => item.status === 'active')?.title,
    'Подтверждено'
  )
})
