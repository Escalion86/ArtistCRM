import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@server/dbConnect'
import Users from '@models/Users'
import Tariffs from '@models/Tariffs'
import PhoneConfirms from '@models/PhoneConfirms'
import {
  findUserByPhone,
  isValidNormalizedPhone,
  normalizePhone,
  safeApiError,
  validateFlow,
} from '@server/phoneVerification'

const isExpired = (expiresAt) =>
  !expiresAt || new Date(expiresAt).getTime() <= Date.now()

const createRegisterUser = async (phone, hashedPassword) => {
  const cheapestTariff = await Tariffs.findOne({
    hidden: { $ne: true },
  })
    .sort({ price: 1, title: 1 })
    .lean()

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const user = await Users.create({
    phone,
    password: hashedPassword,
    role: 'user',
    tenantId: null,
    tariffId: cheapestTariff?._id ?? null,
    trialActivatedAt: now,
    trialEndsAt,
    trialUsed: true,
  })

  if (!user.tenantId) {
    user.tenantId = user._id
    await user.save()
  }
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const phone = normalizePhone(body.phone)
  const password = body.password ?? ''
  const flow = body.flow

  if (!validateFlow(flow)) {
    return NextResponse.json(
      safeApiError('INVALID_FLOW', 'Некорректный режим проверки', 'flow'),
      { status: 400 }
    )
  }

  if (!isValidNormalizedPhone(phone)) {
    return NextResponse.json(
      safeApiError('INVALID_PHONE', 'Введите корректный номер телефона', 'phone'),
      { status: 400 }
    )
  }

  if (!password || String(password).length < 8) {
    return NextResponse.json(
      safeApiError('INVALID_PASSWORD', 'Пароль должен быть не менее 8 символов', 'password'),
      { status: 400 }
    )
  }

  await dbConnect()

  const confirm = await PhoneConfirms.findOne({ phone, flow })
  if (!confirm || isExpired(confirm.expiresAt) || !confirm.confirmed) {
    return NextResponse.json(
      safeApiError(
        'PHONE_NOT_CONFIRMED',
        'Сначала подтвердите номер телефона'
      ),
      { status: 403 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await findUserByPhone(phone)

  if (flow === 'register') {
    if (user?.password) {
      return NextResponse.json(
        safeApiError(
          'PHONE_ALREADY_USED',
          'Пользователь с таким номером уже существует',
          'phone'
        ),
        { status: 409 }
      )
    }

    if (user && !user.password) {
      user.password = hashedPassword
      if (!user.tenantId) user.tenantId = user._id
      await user.save()
    } else {
      await createRegisterUser(phone, hashedPassword)
    }
  }

  if (flow === 'recovery') {
    if (!user) {
      return NextResponse.json(
        safeApiError('PHONE_NOT_FOUND', 'Пользователь не найден', 'phone'),
        { status: 404 }
      )
    }

    user.password = hashedPassword
    await user.save()
  }

  await PhoneConfirms.deleteMany({ phone })

  return NextResponse.json({ success: true }, { status: 200 })
}
