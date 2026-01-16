import { NextResponse } from 'next/server'
import Transactions from '@models/Transactions'
import Events from '@models/Events'
import Clients from '@models/Clients'
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
  const transactions = await Transactions.find({ tenantId })
    .sort({ date: -1, createdAt: -1 })
    .lean()
  return NextResponse.json(
    { success: true, data: transactions },
    { status: 200 }
  )
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

  if (!body.eventId || !body.clientId)
    return NextResponse.json(
      { success: false, error: 'Укажите мероприятие и клиента' },
      { status: 400 }
    )

  const event = await Events.findOne({ _id: body.eventId, tenantId }).lean()
  const client = await Clients.findOne({ _id: body.clientId, tenantId }).lean()

  if (!event || !client)
    return NextResponse.json(
      { success: false, error: 'Мероприятие или клиент не найден' },
      { status: 404 }
    )

  const transaction = await Transactions.create({
    tenantId,
    eventId: body.eventId,
    clientId: body.clientId,
    requestId: body.requestId ?? null,
    amount: Number(body.amount) || 0,
    type: body.type ?? 'expense',
    date: body.date ? new Date(body.date) : new Date(),
    comment: body.comment ?? '',
  })

  if (body.contractSum !== undefined && body.eventId) {
    await Events.findOneAndUpdate(
      { _id: body.eventId, tenantId },
      {
      $set: { contractSum: Number(body.contractSum) || 0 },
      }
    )
  }

  return NextResponse.json({ success: true, data: transaction }, { status: 201 })
}
