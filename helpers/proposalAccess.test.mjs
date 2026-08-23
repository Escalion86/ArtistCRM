import assert from 'node:assert/strict'
import test from 'node:test'

import { canUseProposalBuilder } from './proposalAccess.js'

test('proposal builder is temporarily available only to developer role', () => {
  assert.equal(canUseProposalBuilder({ role: 'dev' }), true)
  assert.equal(canUseProposalBuilder({ role: 'admin' }), false)
  assert.equal(canUseProposalBuilder({ role: 'user' }), false)
  assert.equal(canUseProposalBuilder(null), false)
})
