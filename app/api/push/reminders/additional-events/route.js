import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import { sendAdditionalEventsPushReminders } from '@server/additionalEventsPushReminders'
import { canRunPushReminderCron } from '../cronAccess'

const canRun = async (req) => {
  const cronAccess = canRunPushReminderCron(req)
  if (cronAccess.ok) {
    return { ok: true }
  }

  const { user } = await getTenantContext()
  if (user && ['dev', 'admin'].includes(user.role)) {
    return { ok: true }
  }

  return { ok: false }
}

const handleRequest = async (req) => {
  const access = await canRun(req)
  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 403 }
    )
  }

  await dbConnect()
  const data = await sendAdditionalEventsPushReminders({ now: new Date() })
  console.info('[push-reminders-cron]', data)

  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: 200 }
  )
}

export const GET = handleRequest
export const POST = handleRequest
