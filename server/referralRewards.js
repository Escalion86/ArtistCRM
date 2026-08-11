export const DEFAULT_REFERRAL_PERCENT = 5
export const REFERRAL_REWARD_FOR_BALANCE_TOPUP = 'balance_topup'

const readQuery = async (query) => {
  if (!query) return null
  if (typeof query.lean === 'function') return query.lean()
  return query
}

const getId = (value) => (value ? String(value) : '')

const isSameId = (left, right) => getId(left) && getId(left) === getId(right)

export const normalizeReferralPercent = (value) => {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_REFERRAL_PERCENT
  }
  const percent = Number(value)
  if (!Number.isFinite(percent)) return DEFAULT_REFERRAL_PERCENT
  return Math.min(Math.max(percent, 0), 100)
}

export const calculateReferralRewardAmount = ({ amount, percent }) => {
  const normalizedAmount = Number(amount ?? 0)
  const normalizedPercent = normalizeReferralPercent(percent)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return 0
  if (!Number.isFinite(normalizedPercent) || normalizedPercent <= 0) return 0
  return Math.floor((normalizedAmount * normalizedPercent) / 100)
}

export const getGlobalReferralPercent = async ({ SiteSettingsModel }) => {
  const settings = await readQuery(
    SiteSettingsModel?.findOne({ tenantId: null })
  )
  return normalizeReferralPercent(settings?.referralProgram?.percent)
}

export const createReferralRewardForBalanceTopup = async ({
  payment,
  UsersModel,
  PaymentsModel,
  SiteSettingsModel,
  allowManualReward = false,
}) => {
  const sourcePaymentId = payment?._id
  const isManualRewardAllowed =
    payment?.source !== 'manual' || allowManualReward === true
  const isBalanceTopup =
    payment?.purpose === 'balance' &&
    payment?.type === 'topup' &&
    payment?.source !== 'system' &&
    isManualRewardAllowed

  if (!isBalanceTopup) return { ok: true, skipped: 'not_balance_topup' }
  if (!sourcePaymentId) return { ok: true, skipped: 'missing_source_payment' }
  if (!payment?.userId) return { ok: true, skipped: 'missing_user' }

  const referredUser = await UsersModel?.findById(payment.userId)
  const referrerId = referredUser?.referrerId
  if (!referredUser || !referrerId) {
    return { ok: true, skipped: 'missing_referrer' }
  }
  if (isSameId(referredUser._id, referrerId)) {
    return { ok: true, skipped: 'self_referral' }
  }

  const rewardQuery = {
    'referralReward.sourcePaymentId': sourcePaymentId,
    'referralReward.rewardFor': REFERRAL_REWARD_FOR_BALANCE_TOPUP,
  }
  const existingReward = await PaymentsModel?.findOne(rewardQuery)
  if (existingReward) {
    return {
      ok: true,
      skipped: 'already_rewarded',
      reward: existingReward,
    }
  }

  const referrer = await UsersModel?.findById(referrerId)
  if (!referrer) return { ok: true, skipped: 'referrer_not_found' }

  const percent = await getGlobalReferralPercent({ SiteSettingsModel })
  const rewardAmount = calculateReferralRewardAmount({
    amount: payment.amount,
    percent,
  })
  if (rewardAmount <= 0) return { ok: true, skipped: 'reward_amount_zero' }

  let reward
  try {
    reward = await PaymentsModel.create({
      userId: referrerId,
      tenantId: referrer.tenantId ?? referrer._id,
      tariffId: referrer.tariffId ?? null,
      amount: rewardAmount,
      type: 'topup',
      source: 'system',
      status: 'succeeded',
      purpose: 'balance',
      comment: `Реферальное начисление ${percent}% от пополнения пользователя`,
      referralReward: {
        referralUserId: referredUser._id,
        referrerId,
        sourcePaymentId,
        percent,
        rewardFor: REFERRAL_REWARD_FOR_BALANCE_TOPUP,
      },
    })
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateReward = await PaymentsModel.findOne(rewardQuery)
      if (duplicateReward) {
        return {
          ok: true,
          skipped: 'already_rewarded',
          reward: duplicateReward,
        }
      }
    }
    throw error
  }

  await UsersModel.findByIdAndUpdate(referrerId, {
    $inc: { balance: rewardAmount },
  })

  return { ok: true, rewardAmount, reward }
}
