import { NextResponse } from 'next/server'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import {
  DEFAULT_REFERRAL_PERCENT,
  normalizeReferralPercent,
} from '@server/referralRewards'

const getReferralPayload = (settings) => ({
  percent: normalizeReferralPercent(settings?.referralProgram?.percent),
})

export const GET = async () => {
  const { user } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  await dbConnect()
  const settings = await SiteSettings.findOne({ tenantId: null }).lean()

  return NextResponse.json(
    {
      success: true,
      data: settings
        ? getReferralPayload(settings)
        : { percent: DEFAULT_REFERRAL_PERCENT },
    },
    { status: 200 }
  )
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const { user } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  if (user?.role !== 'dev') {
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 403 }
    )
  }

  const percent = normalizeReferralPercent(body?.percent)

  await dbConnect()
  const settings = await SiteSettings.findOneAndUpdate(
    { tenantId: null },
    {
      $set: {
        tenantId: null,
        'referralProgram.percent': percent,
      },
    },
    { returnDocument: 'after', upsert: true }
  ).lean()

  return NextResponse.json(
    {
      success: true,
      data: getReferralPayload(settings),
    },
    { status: 200 }
  )
}
