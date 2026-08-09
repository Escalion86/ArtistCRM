import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import SiteSettings from '@models/SiteSettings'
import Tariffs from '@models/Tariffs'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import {
  DEFAULT_REGISTRATION_TRIAL_DAYS,
  getRegistrationTrialSettings,
} from '@server/registrationTrial'

const canManage = (user) => ['dev', 'admin'].includes(user?.role)

const forbidden = () =>
  NextResponse.json({ success: false, error: 'Нет доступа' }, { status: 403 })

export const GET = async () => {
  const { user } = await getTenantContext()
  if (!canManage(user)) return forbidden()
  await dbConnect()
  const settings = await getRegistrationTrialSettings()
  return NextResponse.json({
    success: true,
    data: {
      enabled: settings.enabled,
      tariffId: settings.tariff?._id ? String(settings.tariff._id) : '',
      durationDays: settings.durationDays,
      welcomeMessage: settings.welcomeMessage,
    },
  })
}

export const POST = async (req) => {
  const { user } = await getTenantContext()
  if (!canManage(user)) return forbidden()
  const body = await req.json().catch(() => ({}))
  const tariffId = String(body?.tariffId || '').trim()
  const durationDays = Math.round(Number(body?.durationDays))
  const welcomeMessage = String(body?.welcomeMessage || '').trim()

  if (!mongoose.Types.ObjectId.isValid(tariffId)) {
    return NextResponse.json(
      { success: false, error: 'Выберите тариф' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 365) {
    return NextResponse.json(
      { success: false, error: 'Срок должен быть от 1 до 365 дней' },
      { status: 400 }
    )
  }
  if (welcomeMessage.length > 2000) {
    return NextResponse.json(
      { success: false, error: 'Сообщение не может быть длиннее 2000 символов' },
      { status: 400 }
    )
  }

  await dbConnect()
  const tariff = await Tariffs.findById(tariffId).select('_id').lean()
  if (!tariff) {
    return NextResponse.json(
      { success: false, error: 'Тариф не найден' },
      { status: 404 }
    )
  }

  const registrationTrial = {
    enabled: body?.enabled !== false,
    tariffId: tariff._id,
    durationDays: durationDays || DEFAULT_REGISTRATION_TRIAL_DAYS,
    welcomeMessage,
  }
  await SiteSettings.findOneAndUpdate(
    { tenantId: null },
    { $set: { tenantId: null, registrationTrial } },
    { upsert: true, returnDocument: 'after' }
  )

  return NextResponse.json({
    success: true,
    data: { ...registrationTrial, tariffId },
  })
}
