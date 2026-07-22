import { NextResponse } from 'next/server'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  DEFAULT_AI_MARKUP_COEFFICIENT,
  normalizeAiMarkupCoefficient,
} from '@server/aiBilling'

const serializeSettings = (settings) => ({
  markupCoefficient: normalizeAiMarkupCoefficient(
    settings?.aiBilling?.markupCoefficient
  ),
  platformConfigured: Boolean(String(process.env.AITUNNEL_KEY || '').trim()),
})

const requireDeveloper = async (req) => {
  const { user } = await getRequestContext(req)
  if (!user) return { status: 401, error: 'Не авторизован' }
  if (user.role !== 'dev') return { status: 403, error: 'Нет доступа' }
  return { user }
}

export const GET = async (req) => {
  const access = await requireDeveloper(req)
  if (access.error) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status }
    )
  }

  await dbConnect()
  const settings = await SiteSettings.findOne({ tenantId: null })
    .select('aiBilling')
    .lean()

  return NextResponse.json({
    success: true,
    data: settings
      ? serializeSettings(settings)
      : {
          markupCoefficient: DEFAULT_AI_MARKUP_COEFFICIENT,
          platformConfigured: Boolean(
            String(process.env.AITUNNEL_KEY || '').trim()
          ),
        },
  })
}

export const POST = async (req) => {
  const access = await requireDeveloper(req)
  if (access.error) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status }
    )
  }
  const body = await req.json().catch(() => ({}))
  const rawCoefficient = Number(body?.markupCoefficient)
  if (!Number.isFinite(rawCoefficient) || rawCoefficient < 1 || rawCoefficient > 10) {
    return NextResponse.json(
      { success: false, error: 'Коэффициент должен быть от 1 до 10' },
      { status: 400 }
    )
  }

  await dbConnect()
  const settings = await SiteSettings.findOneAndUpdate(
    { tenantId: null },
    {
      $set: {
        tenantId: null,
        'aiBilling.markupCoefficient': normalizeAiMarkupCoefficient(
          rawCoefficient
        ),
      },
    },
    { returnDocument: 'after', upsert: true }
  ).lean()

  return NextResponse.json({ success: true, data: serializeSettings(settings) })
}
