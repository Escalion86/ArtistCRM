import { NextResponse } from 'next/server'
import Transactions from '@models/Transactions'
import Events from '@models/Events'
import Clients from '@models/Clients'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { normalizeOptionalRelationId } from '@server/transactionsCore'
import { OBLIGATION_PAYMENT_METHOD } from '@helpers/transactionObligation'

const CATEGORY_ALIASES = {
  advance: 'deposit',
  client_payment: 'final_payment',
  colleague_percent: 'referral_in',
}

const normalizeCategory = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return 'other'
  return CATEGORY_ALIASES[raw] || raw
}

export const GET = async (req) => {
  const { tenantId } = await getRequestContext(req)
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const { searchParams } = new URL(req.url)
  const eventIds = (searchParams.get('eventIds') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const clientId = (searchParams.get('clientId') || '').trim()
  const query = { tenantId }
  if (eventIds.length > 0) query.eventId = { $in: eventIds }
  if (clientId) query.clientId = clientId
  const transactions = await Transactions.find(query)
    .sort({ date: -1, createdAt: -1 })
    .lean()
  return NextResponse.json(
    { success: true, data: transactions },
    { status: 200 }
  )
}

export const POST = async (req) => {
  const body = await req.json()
  const { tenantId } = await getRequestContext(req)
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()

  const eventId = normalizeOptionalRelationId(body.eventId)
  const bodyClientId = normalizeOptionalRelationId(body.clientId)
  let event = null

  if (eventId) {
    event = await Events.findOne({ _id: eventId, tenantId }).lean()
    if (!event)
      return NextResponse.json(
        { success: false, error: 'Мероприятие не найдено' },
        { status: 404 }
      )
    if (event?.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'Транзакции недоступны для заявки' },
        { status: 400 }
      )
    }
  }

  const clientId = event?.clientId ? String(event.clientId) : bodyClientId

  if (clientId) {
    const client = await Clients.findOne({ _id: clientId, tenantId }).lean()
    if (!client)
      return NextResponse.json(
        { success: false, error: 'Клиент не найден' },
        { status: 404 }
      )
  }

  const paymentMethod =
    body.paymentMethod &&
    ['transfer', 'account', 'cash', 'barter', OBLIGATION_PAYMENT_METHOD].includes(
      body.paymentMethod
    )
      ? body.paymentMethod
      : 'transfer'

  const transaction = await Transactions.create({
    tenantId,
    eventId,
    clientId,
    amount: Number(body.amount) || 0,
    type: body.type ?? 'expense',
    category: normalizeCategory(body.category),
    date: body.date ? new Date(body.date) : new Date(),
    comment: body.comment ?? '',
    paymentMethod,
  })

  if (body.contractSum !== undefined && eventId) {
    await Events.findOneAndUpdate(
      { _id: eventId, tenantId },
      {
        $set: { contractSum: Number(body.contractSum) || 0 },
      }
    )
  }

  return NextResponse.json({ success: true, data: transaction }, { status: 201 })
}
