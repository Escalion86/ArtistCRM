import { NextResponse } from 'next/server'
import ServiceGroups from '@models/ServiceGroups'
import Services from '@models/Services'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import { buildTenantSafeUpdate } from '@server/tenantSafeUpdate'

export const PUT = async (req, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const group = await ServiceGroups.findOneAndUpdate(
    { _id: id, tenantId },
    buildTenantSafeUpdate(body),
    {
      returnDocument: 'after',
      runValidators: true,
    }
  )
  if (!group)
    return NextResponse.json(
      { success: false, error: 'Группа не найдена' },
      { status: 404 }
    )
  return NextResponse.json({ success: true, data: group }, { status: 200 })
}

export const DELETE = async (req, { params }) => {
  const { id } = await params
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()

  const group = await ServiceGroups.findOne({ _id: id, tenantId })
  if (!group)
    return NextResponse.json(
      { success: false, error: 'Группа не найдена' },
      { status: 404 }
    )

  const movedServices = await Services.updateMany(
    { tenantId, groupId: id },
    { $set: { groupId: null } }
  )

  await ServiceGroups.deleteOne({ _id: id, tenantId })

  return NextResponse.json(
    {
      success: true,
      data: { movedServicesCount: movedServices.modifiedCount ?? 0 },
    },
    { status: 200 }
  )
}
