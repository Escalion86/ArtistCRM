import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAdminReferralGroups,
  buildReferralRows,
} from './referralSummary.js'

const users = [
  {
    _id: 'referrer-1',
    firstName: 'Иван',
    secondName: 'Реферер',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    _id: 'referral-1',
    firstName: 'Анна',
    secondName: 'Первая',
    referrerId: 'referrer-1',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    _id: 'referral-2',
    firstName: 'Петр',
    secondName: 'Второй',
    referrerId: 'referrer-1',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
]

const payments = [
  {
    _id: 'reward-1',
    amount: 50,
    createdAt: '2026-01-04T00:00:00.000Z',
    referralReward: {
      referralUserId: 'referral-1',
      referrerId: 'referrer-1',
      rewardFor: 'balance_topup',
    },
  },
  {
    _id: 'reward-2',
    amount: 25,
    createdAt: '2026-01-05T00:00:00.000Z',
    referralReward: {
      referralUserId: 'referral-1',
      referrerId: 'referrer-1',
      rewardFor: 'balance_topup',
    },
  },
]

test('buildReferralRows attaches reward totals to referred users', () => {
  const rows = buildReferralRows({
    referrals: users.slice(1),
    rewardPayments: payments,
  })
  const firstReferral = rows.find((row) => row.user._id === 'referral-1')
  const secondReferral = rows.find((row) => row.user._id === 'referral-2')

  assert.equal(rows.length, 2)
  assert.equal(firstReferral.rewardsTotal, 75)
  assert.equal(firstReferral.rewardsCount, 2)
  assert.equal(firstReferral.lastRewardAt, '2026-01-05T00:00:00.000Z')
  assert.equal(secondReferral.rewardsTotal, 0)
  assert.equal(secondReferral.rewardsCount, 0)
  assert.equal(secondReferral.lastRewardAt, null)
})

test('buildAdminReferralGroups groups referrals by referrer and totals rewards', () => {
  const groups = buildAdminReferralGroups({
    referrers: [users[0]],
    referrals: users.slice(1),
    rewardPayments: payments,
  })

  assert.equal(groups.length, 1)
  assert.equal(groups[0].referrer._id, 'referrer-1')
  assert.equal(groups[0].referralsCount, 2)
  assert.equal(groups[0].rewardsTotal, 75)
  assert.equal(groups[0].rewardsCount, 2)
  assert.ok(
    groups[0].referrals.some((row) => row.user._id === 'referral-1')
  )
})
