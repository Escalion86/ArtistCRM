import { NextResponse } from 'next/server'
import getTenantContext from '@server/getTenantContext'
import dbConnect from '@server/dbConnect'
import {
  recordCabinetVisit,
  recordOnboardingCompleted,
  recordPilotDemoRequested,
} from '@server/acquisitionFunnel'

const ALLOWED_EVENTS = new Set([
  'cabinet_visit',
  'onboarding_complete',
  'pilot_demo_requested',
])

export const POST = async (req) => {
  const { user } = await getTenantContext()
  if (!user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  const body = await req.json().catch(() => ({}))
  const event = String(body?.event || '')
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json(
      { success: false, error: 'Некорректное событие' },
      { status: 400 }
    )
  }

  await dbConnect()
  if (event === 'onboarding_complete') {
    const recorded = await recordOnboardingCompleted(user._id)
    return NextResponse.json({ success: true, recorded })
  }
  if (event === 'pilot_demo_requested') {
    const recorded = await recordPilotDemoRequested(user._id)
    return NextResponse.json({ success: true, recorded })
  }

  const result = await recordCabinetVisit(user._id)
  return NextResponse.json({ success: true, ...result })
}
