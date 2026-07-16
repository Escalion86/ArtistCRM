import { NextResponse } from 'next/server'
import Transactions from '@models/Transactions'
import Events from '@models/Events'
import Clients from '@models/Clients'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  getOptionalRelationUpdateValue,
  normalizeOptionalRelationId,
} from '@server/transactionsCore'
import { OBLIGATION_PAYMENT_METHOD } from '@helpers/transactionObligation'
import { recordSyncTombstone } from '@server/mobile/sync'

const TRANSACTION_TYPES = new Set(['income', 'expense'])
const TRANSACTION_PAYMENT_METHODS = new Set([
  'transfer',
  'account',
  'cash',
  'barter',
  OBLIGATION_PAYMENT_METHOD,
])
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
  const existing = await Transactions.findOne({ _id: id, tenantId }).lean()
  if (!existing)
    return NextResponse.json(
      { success: false, error: 'Транзакция не найдена' },
      { status: 404 }
    )

  const update = {}
  if (body.amount !== undefined) update.amount = Number(body.amount) || 0
  if (body.date !== undefined)
    update.date = body.date ? new Date(body.date) : new Date()
  if (body.comment !== undefined) update.comment = body.comment ?? ''
  if (body.type && TRANSACTION_TYPES.has(body.type)) update.type = body.type
  if (body.category !== undefined)
    update.category = normalizeCategory(body.category)
  if (
    body.paymentMethod &&
    TRANSACTION_PAYMENT_METHODS.has(body.paymentMethod)
  ) {
    update.paymentMethod = body.paymentMethod
  }

  const nextEventId = getOptionalRelationUpdateValue({
    body,
    existing,
    field: 'eventId',
  })
  let event = null
  if (nextEventId) {
    event = await Events.findOne({ _id: nextEventId, tenantId }).lean()
    if (!event)
      return NextResponse.json(
        { success: false, error: 'Мероприятие не найдено' },
        { status: 404 }
      )
    if (event?.status === 'draft')
      return NextResponse.json(
        { success: false, error: 'Транзакции недоступны для заявки' },
        { status: 400 }
      )
  }

  const fallbackClientId = getOptionalRelationUpdateValue({
    body,
    existing,
    field: 'clientId',
  })
  const nextClientId = event?.clientId
    ? String(event.clientId)
    : normalizeOptionalRelationId(fallbackClientId)

  if (nextClientId) {
    const client = await Clients.findOne({ _id: nextClientId, tenantId }).lean()
    if (!client)
      return NextResponse.json(
        { success: false, error: 'Клиент не найден' },
        { status: 404 }
      )
  }

  update.eventId = nextEventId
  update.clientId = nextClientId
  update.syncVersion = Number(existing?.syncVersion || 1) + 1

  const transaction = await Transactions.findOneAndUpdate(
    { _id: id, tenantId },
    update,
    {
      returnDocument: 'after',
    }
  )

  return NextResponse.json({ success: true, data: transaction }, { status: 200 })
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
  const deleted = await Transactions.findOneAndDelete({ _id: id, tenantId })
  if (!deleted)
    return NextResponse.json(
      { success: false, error: 'Транзакция не найдена' },
      { status: 404 }
    )
  await recordSyncTombstone({
    tenantId,
    entityType: 'transactions',
    entityId: id,
    version: deleted.syncVersion,
  })
  return NextResponse.json({ success: true }, { status: 200 })
}
