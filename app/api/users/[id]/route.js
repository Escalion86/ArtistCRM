import { NextResponse } from 'next/server'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import bcrypt from 'bcryptjs'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const sanitizeUser = (user) => {
  if (!user) return null
  const data = typeof user.toObject === 'function' ? user.toObject() : user
  const { password, ...rest } = data
  return rest
}

export const PUT = async (req, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { user, tenantId } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()

  const canManageAllUsers = ['dev', 'admin'].includes(user?.role)
  const query = canManageAllUsers ? { _id: id } : { _id: id, tenantId }
  const existing = await Users.findOne(query)
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }

  const normalizedPhone = body.phone !== undefined ? normalizePhone(body.phone) : null
  if (normalizedPhone) {
    const phoneAsNumber = Number(normalizedPhone)
    const phoneQuery = Number.isNaN(phoneAsNumber)
      ? { phone: normalizedPhone }
      : { $or: [{ phone: normalizedPhone }, { phone: phoneAsNumber }] }
    const duplicate = await Users.findOne({
      ...phoneQuery,
      _id: { $ne: existing._id },
    }).lean()
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'Телефон уже используется' },
        { status: 409 }
      )
    }
  }

  const update = { ...body }
  if (normalizedPhone !== null) update.phone = normalizedPhone
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10)
  } else {
    delete update.password
  }

  const updated = await Users.findOneAndUpdate(query, update, { new: true })
  return NextResponse.json(
    { success: true, data: sanitizeUser(updated) },
    { status: 200 }
  )
}

export const DELETE = async (req, { params }) => {
  const { id } = await params
  const { user, tenantId } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()

  const canManageAllUsers = ['dev', 'admin'].includes(user?.role)
  const query = canManageAllUsers ? { _id: id } : { _id: id, tenantId }
  const deleted = await Users.findOneAndDelete(query)
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }
  return NextResponse.json({ success: true }, { status: 200 })
}
