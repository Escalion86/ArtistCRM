import { NextResponse } from 'next/server'
import ServiceGroups from '@models/ServiceGroups'
import Services from '@models/Services'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { buildTenantSafeUpdate } from '@server/tenantSafeUpdate'
import {
  recordSyncTombstone,
  withSyncVersionIncrement,
} from '@server/mobile/sync'

export const PUT = async (req, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { tenantId } = await getRequestContext(req)
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const group = await ServiceGroups.findOneAndUpdate(
    { _id: id, tenantId },
    withSyncVersionIncrement(buildTenantSafeUpdate(body)),
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
  const { tenantId } = await getRequestContext(req)
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
    { $set: { groupId: null }, $inc: { syncVersion: 1 } }
  )

  await ServiceGroups.deleteOne({ _id: id, tenantId })

  await recordSyncTombstone({
    tenantId,
    entityType: 'serviceGroups',
    entityId: id,
    version: group.syncVersion,
  })

  return NextResponse.json(
    {
      success: true,
      data: { movedServicesCount: movedServices.modifiedCount ?? 0 },
    },
    { status: 200 }
  )
}
