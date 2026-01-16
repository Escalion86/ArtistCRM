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
  const newPassword = body.newPassword ?? ''

  if (!phone || !newPassword) {
    return NextResponse.json(
      { success: false, error: 'Укажите телефон и новый пароль' },
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
  const user = await Users.findOne(phoneQuery)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()

  return NextResponse.json({ success: true }, { status: 200 })
}
