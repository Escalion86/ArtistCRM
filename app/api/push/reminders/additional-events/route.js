import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import { sendAdditionalEventsPushReminders } from '@server/additionalEventsPushReminders'

const canRun = async (req) => {
  const secret = process.env.PUSH_REMINDERS_CRON_SECRET || ''
  const headerToken = req.headers.get('x-cron-secret') || ''
  const url = new URL(req.url)
  const queryToken = url.searchParams.get('token') || ''

  if (secret && (headerToken === secret || queryToken === secret)) {
    return { ok: true }
  }

  const { user } = await getTenantContext()
  if (user && ['dev', 'admin'].includes(user.role)) {
    return { ok: true }
  }

  return { ok: false }
}

export const POST = async (req) => {
  const access = await canRun(req)
  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 403 }
    )
  }

  await dbConnect()
  const data = await sendAdditionalEventsPushReminders({ now: new Date() })

  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: 200 }
  )
}
