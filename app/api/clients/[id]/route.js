import { NextResponse } from 'next/server'
import Clients from '@models/Clients'
import Events from '@models/Events'
import Transactions from '@models/Transactions'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { buildTenantSafeUpdate } from '@server/tenantSafeUpdate'
import {
  recordSyncTombstone,
  withSyncVersionIncrement,
} from '@server/mobile/sync'

export const GET = async (req, { params }) => {
  const { id } = await params
  const { tenantId } = await getRequestContext(req)
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const client = await Clients.findOne({ _id: id, tenantId }).lean()
  if (!client)
    return NextResponse.json(
      { success: false, error: 'Клиент не найден' },
      { status: 404 }
    )
  return NextResponse.json({ success: true, data: client }, { status: 200 })
}

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

  const client = await Clients.findOneAndUpdate(
    { _id: id, tenantId },
    withSyncVersionIncrement(buildTenantSafeUpdate(body)),
    {
      returnDocument: 'after',
      runValidators: true,
    }
  )
  if (!client)
    return NextResponse.json(
      { success: false, error: 'Клиент не найден' },
      { status: 404 }
    )

  return NextResponse.json({ success: true, data: client }, { status: 200 })
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
  const eventsCount = await Events.countDocuments({ tenantId, clientId: id })
  if (eventsCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Нельзя удалить клиента: есть связанные мероприятия (${eventsCount})`,
      },
      { status: 409 }
    )
  }
  const transactionsCount = await Transactions.countDocuments({
    tenantId,
    clientId: id,
  })
  if (transactionsCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Нельзя удалить клиента: есть связанные транзакции (${transactionsCount})`,
      },
      { status: 409 }
    )
  }
  const deleted = await Clients.findOneAndDelete({ _id: id, tenantId })
  if (!deleted)
    return NextResponse.json(
      { success: false, error: 'Клиент не найден' },
      { status: 404 }
    )
  await recordSyncTombstone({
    tenantId,
    entityType: 'clients',
    entityId: id,
    version: deleted.syncVersion,
  })
  return NextResponse.json(
    { success: true, data: { _id: String(id) } },
    { status: 200 }
  )
}
