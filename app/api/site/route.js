import { NextResponse } from 'next/server'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'

const normalizeTowns = (towns = []) =>
  Array.from(
    new Set(
      towns
        .map((town) => (typeof town === 'string' ? town.trim() : ''))
        .filter(Boolean)
    )
  )

export const GET = async () => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const siteSettings = await SiteSettings.findOne({ tenantId }).lean()
  return NextResponse.json(
    { success: true, data: siteSettings ?? {} },
    { status: 200 }
  )
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()

  const update = {}
  if (body.eventsTags !== undefined) update.eventsTags = body.eventsTags ?? []
  if (body.towns !== undefined) update.towns = normalizeTowns(body.towns)
  if (body.defaultTown !== undefined)
    update.defaultTown = body.defaultTown ?? ''
  if (body.custom !== undefined) update.custom = body.custom ?? {}
  if (body.fabMenu !== undefined) update.fabMenu = body.fabMenu ?? []
  if (body.supervisor !== undefined) update.supervisor = body.supervisor ?? {}
  if (body.dateStartProject !== undefined)
    update.dateStartProject = body.dateStartProject ?? null
  if (body.headerInfo !== undefined) update.headerInfo = body.headerInfo ?? {}
  if (body.codeSendService !== undefined)
    update.codeSendService = body.codeSendService ?? 'telefonip'
  if (body.email !== undefined) update.email = body.email ?? null
  if (body.phone !== undefined) update.phone = body.phone ?? null
  if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp ?? null
  if (body.viber !== undefined) update.viber = body.viber ?? null
  if (body.telegram !== undefined) update.telegram = body.telegram ?? null
  if (body.instagram !== undefined) update.instagram = body.instagram ?? null
  if (body.vk !== undefined) update.vk = body.vk ?? null
  if (body.timeZone !== undefined)
    update.timeZone = body.timeZone ?? 'Asia/Krasnoyarsk'
  if (body.storeCalendarResponse !== undefined)
    update.storeCalendarResponse = Boolean(body.storeCalendarResponse)

  const siteSettings = await SiteSettings.findOneAndUpdate(
    { tenantId },
    { $set: { ...update, tenantId } },
    { new: true, upsert: true }
  )

  return NextResponse.json(
    { success: true, data: siteSettings },
    { status: 200 }
  )
}
