import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^0-9]/g, '')
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const phone = normalizePhone(body.phone)
  const password = body.password ?? ''

  if (!phone || !password) {
    return NextResponse.json(
      { success: false, error: 'Укажите телефон и пароль' },
      { status: 400 }
    )
  }
  if (phone.length !== 11) {
    return NextResponse.json(
      { success: false, error: 'INVALID_PHONE_LENGTH' },
      { status: 400 }
    )
  }

  await dbConnect()

  const numericPhone = Number(phone)
  const phoneQuery = Number.isNaN(numericPhone)
    ? { phone }
    : { $or: [{ phone }, { phone: numericPhone }] }
  const existingUser = await Users.findOne(phoneQuery)

  if (existingUser) {
    return NextResponse.json(
      { success: false, error: 'Пользователь с таким номером уже существует' },
      { status: 409 }
    )
  }

  try {
    const hashed = await bcrypt.hash(password, 10)
    const user = await Users.create({
      phone,
      password: hashed,
      role: 'user',
      tenantId: null,
    })

    if (!user.tenantId) {
      user.tenantId = user._id
      await user.save()
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Пользователь с таким номером уже существует' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Не удалось зарегистрироваться' },
      { status: 500 }
    )
  }
}
