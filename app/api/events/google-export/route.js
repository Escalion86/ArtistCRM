import { NextResponse } from 'next/server'
import { getCalendarClient, listCalendarEvents } from '@server/googleCalendarClient'
import getTenantContext from '@server/getTenantContext'

const DEFAULT_TIME_MIN = '2000-01-01T00:00:00.000Z'

const buildExportBlock = (calendarEvent) => {
  const lines = [
    calendarEvent?.summary ?? '',
    calendarEvent?.description ?? '',
    calendarEvent?.location ?? '',
  ]

  if (!calendarEvent?.description) return ''

  if (lines.every((value) => !value)) return ''

  return lines.join('\n')
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  const calendarId = body.calendarId ?? process.env.GOOGLE_CALENDAR_ID

  if (!calendarId)
    return NextResponse.json(
      { success: false, error: 'Укажите GOOGLE_CALENDAR_ID или calendarId' },
      { status: 400 }
    )

  const calendar = await getCalendarClient()
  if (!calendar)
    return NextResponse.json(
      {
        success: false,
        error:
          'Не найден файл google_calendar_token.json. Положите файл с ключами в корень проекта или укажите GOOGLE_CALENDAR_CREDENTIALS_PATH.',
      },
      { status: 500 }
    )

  const timeMin = body.timeMin ?? DEFAULT_TIME_MIN
  const timeMax = body.timeMax ?? undefined

  let googleEvents
  try {
    googleEvents = await listCalendarEvents(calendar, {
      calendarId,
      timeMin,
      timeMax,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Не удалось загрузить события Google Calendar: ${error?.message ?? error}`,
      },
      { status: 502 }
    )
  }

  const items = Array.isArray(googleEvents.items) ? googleEvents.items : []
  const blocks = []
  let skipped = 0

  for (const item of items) {
    const summary = item?.summary ?? ''
    if (/заявк/i.test(summary)) {
      skipped += 1
      continue
    }
    const block = buildExportBlock(item)
    if (block) blocks.push(block)
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        count: blocks.length,
        skipped,
        text: blocks.join('\n---\n'),
      },
    },
    { status: 200 }
  )
}
