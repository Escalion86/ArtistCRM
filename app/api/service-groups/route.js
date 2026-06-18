import { NextResponse } from 'next/server'
import ServiceGroups from '@models/ServiceGroups'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'

export const GET = async () => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const groups = await ServiceGroups.find({ tenantId })
    .sort({ order: 1, title: 1 })
    .lean()
  return NextResponse.json({ success: true, data: groups }, { status: 200 })
}

export const POST = async (req) => {
  const body = await req.json()
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const group = await ServiceGroups.create({ ...body, tenantId })
  return NextResponse.json({ success: true, data: group }, { status: 201 })
}
