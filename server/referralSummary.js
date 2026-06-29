import { REFERRAL_REWARD_FOR_BALANCE_TOPUP } from './referralRewards.js'

const toId = (value) => (value ? String(value) : '')

const serializeUser = (user) => ({
  _id: toId(user?._id),
  firstName: user?.firstName ?? '',
  secondName: user?.secondName ?? '',
  thirdName: user?.thirdName ?? '',
  registrationType: user?.registrationType ?? '',
  createdAt: user?.createdAt ?? null,
})

const getPaymentDate = (payment) =>
  payment?.paidAt ?? payment?.createdAt ?? payment?.updatedAt ?? null

const pickLatestDate = (left, right) => {
  if (!left) return right ?? null
  if (!right) return left
  return new Date(right).getTime() > new Date(left).getTime() ? right : left
}

const buildRewardsByReferral = (rewardPayments = []) =>
  rewardPayments.reduce((map, payment) => {
    if (
      payment?.referralReward?.rewardFor !== REFERRAL_REWARD_FOR_BALANCE_TOPUP
    ) {
      return map
    }

    const referralUserId = toId(payment?.referralReward?.referralUserId)
    if (!referralUserId) return map

    const current = map.get(referralUserId) ?? {
      rewardsTotal: 0,
      rewardsCount: 0,
      lastRewardAt: null,
    }
    current.rewardsTotal += Number(payment?.amount ?? 0)
    current.rewardsCount += 1
    current.lastRewardAt = pickLatestDate(current.lastRewardAt, getPaymentDate(payment))
    map.set(referralUserId, current)
    return map
  }, new Map())

export const buildReferralRows = ({ referrals = [], rewardPayments = [] }) => {
  const rewardsByReferral = buildRewardsByReferral(rewardPayments)

  return referrals
    .map((user) => {
      const userId = toId(user?._id)
      const rewards = rewardsByReferral.get(userId) ?? {
        rewardsTotal: 0,
        rewardsCount: 0,
        lastRewardAt: null,
      }

      return {
        user: serializeUser(user),
        rewardsTotal: rewards.rewardsTotal,
        rewardsCount: rewards.rewardsCount,
        lastRewardAt: rewards.lastRewardAt,
      }
    })
    .sort((left, right) => {
      const leftTime = left.user.createdAt
        ? new Date(left.user.createdAt).getTime()
        : 0
      const rightTime = right.user.createdAt
        ? new Date(right.user.createdAt).getTime()
        : 0
      return rightTime - leftTime
    })
}

export const buildAdminReferralGroups = ({
  referrers = [],
  referrals = [],
  rewardPayments = [],
}) => {
  const referrersById = new Map(
    referrers.map((user) => [toId(user?._id), serializeUser(user)])
  )
  const referralsByReferrer = referrals.reduce((map, referral) => {
    const referrerId = toId(referral?.referrerId)
    if (!referrerId) return map
    const current = map.get(referrerId) ?? []
    current.push(referral)
    map.set(referrerId, current)
    return map
  }, new Map())
  const rewardsByReferrer = rewardPayments.reduce((map, payment) => {
    if (
      payment?.referralReward?.rewardFor !== REFERRAL_REWARD_FOR_BALANCE_TOPUP
    ) {
      return map
    }

    const referrerId = toId(payment?.referralReward?.referrerId)
    if (!referrerId) return map

    const current = map.get(referrerId) ?? {
      rewardsTotal: 0,
      rewardsCount: 0,
      lastRewardAt: null,
    }
    current.rewardsTotal += Number(payment?.amount ?? 0)
    current.rewardsCount += 1
    current.lastRewardAt = pickLatestDate(current.lastRewardAt, getPaymentDate(payment))
    map.set(referrerId, current)
    return map
  }, new Map())

  return Array.from(referralsByReferrer.entries())
    .map(([referrerId, referrerReferrals]) => {
      const rows = buildReferralRows({
        referrals: referrerReferrals,
        rewardPayments,
      })
      const rewards = rewardsByReferrer.get(referrerId) ?? {
        rewardsTotal: 0,
        rewardsCount: 0,
        lastRewardAt: null,
      }

      return {
        referrer: referrersById.get(referrerId) ?? {
          _id: referrerId,
          firstName: '',
          secondName: '',
          thirdName: '',
          registrationType: '',
          createdAt: null,
        },
        referrals: rows,
        referralsCount: rows.length,
        rewardsTotal: rewards.rewardsTotal,
        rewardsCount: rewards.rewardsCount,
        lastRewardAt: rewards.lastRewardAt,
      }
    })
    .sort((left, right) => {
      if (right.rewardsTotal !== left.rewardsTotal) {
        return right.rewardsTotal - left.rewardsTotal
      }
      return right.referralsCount - left.referralsCount
    })
}
