import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import Histories from '@models/Histories'
import Events from '@models/Events'
import Clients from '@models/Clients'
import Transactions from '@models/Transactions'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'

const ENTITY_TYPES = new Set(['event', 'client', 'transaction'])
const OPERATIONS = new Set(['create', 'update', 'delete', 'merge'])

const parseLimit = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(100, Math.max(1, Math.trunc(number))) : 30
}

const parseCursor = (value) => {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    const occurredAt = new Date(parsed?.occurredAt)
    if (Number.isNaN(occurredAt.getTime()) || !mongoose.Types.ObjectId.isValid(parsed?.id)) return null
    return { occurredAt, id: new mongoose.Types.ObjectId(parsed.id) }
  } catch {
    return null
  }
}

const makeCursor = (item) =>
  Buffer.from(JSON.stringify({ occurredAt: item.occurredAt, id: String(item._id) })).toString('base64url')

const escapeRegex = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100)

const toDisplayItem = (item, existingEntities) => ({
  id: String(item._id),
  entityType: item.entityType,
  entityId: item.entityId,
  operation: item.operation,
  semanticAction: item.semanticAction || '',
  entityLabel: item.entityLabel || '',
  summary: item.summary || '',
  changes: Array.isArray(item.changes)
    ? item.changes.map(({ field, label, oldValue, newValue }) => ({ field, label, oldValue, newValue }))
    : [],
  actorType: item.actorType || '',
  actorId: item.actorId || '',
  actorLabel: item.actorLabel || '',
  source: item.source || '',
  occurredAt: item.occurredAt || item.createdAt,
  createdAt: item.createdAt,
  batchId: item.batchId || '',
  legacy: Boolean(item.legacy),
  entityExists: existingEntities.has(`${item.entityType}:${item.entityId}`),
})

const getExistingEntities = async (items, tenantId) => {
  const models = { event: Events, client: Clients, transaction: Transactions }
  const existing = new Set()
  await Promise.all(Object.entries(models).map(async ([entityType, Model]) => {
    const ids = items
      .filter((item) => item.entityType === entityType)
      .map((item) => item.entityId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
    if (ids.length === 0) return
    const rows = await Model.find({ _id: { $in: ids }, tenantId }).select('_id').lean()
    rows.forEach((row) => existing.add(`${entityType}:${row._id}`))
  }))
  return existing
}

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context?.tenantId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          type: 'histories',
          message: 'Не авторизован',
        },
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const legacySchema = String(searchParams.get('schema') || '').trim()
  const entityType = String(
    searchParams.get('entityType') || (legacySchema === 'events' ? 'event' : '')
  ).trim()
  const entityId = String(
    searchParams.get('entityId') || searchParams.get('data._id') || ''
  ).trim()
  const operation = String(searchParams.get('operation') || '').trim()
  const source = String(searchParams.get('source') || '').trim()
  const actorId = String(searchParams.get('actorId') || '').trim()
  const search = escapeRegex(searchParams.get('search'))
  const limit = parseLimit(searchParams.get('limit'))
  const cursor = parseCursor(searchParams.get('cursor'))

  const query = { tenantId: context.tenantId }
  if (ENTITY_TYPES.has(entityType)) query.entityType = entityType
  if (entityId) query.entityId = entityId.slice(0, 128)
  if (OPERATIONS.has(operation)) query.operation = operation
  if (source) query.source = source.slice(0, 100)
  if (actorId) query.actorId = actorId.slice(0, 100)

  const rawDateFrom = searchParams.get('dateFrom')
  const rawDateTo = searchParams.get('dateTo')
  const dateFilter = {}
  if (rawDateFrom) {
    const dateFrom = new Date(rawDateFrom)
    if (!Number.isNaN(dateFrom.getTime())) dateFilter.$gte = dateFrom
  }
  if (rawDateTo) {
    const dateTo = new Date(rawDateTo)
    if (!Number.isNaN(dateTo.getTime())) dateFilter.$lte = dateTo
  }
  if (Object.keys(dateFilter).length > 0) query.occurredAt = dateFilter

  const conditions = []
  if (search) {
    const regex = new RegExp(search, 'i')
    conditions.push({ $or: [{ entityLabel: regex }, { summary: regex }, { actorLabel: regex }] })
  }
  if (cursor) {
    conditions.push({
      $or: [
        { occurredAt: { $lt: cursor.occurredAt } },
        { occurredAt: cursor.occurredAt, _id: { $lt: cursor.id } },
      ],
    })
  }
  if (conditions.length > 0) query.$and = conditions

  await dbConnect()
  const rows = await Histories.find(query)
    .sort({ occurredAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean()
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const existingEntities = await getExistingEntities(items, context.tenantId)

  return NextResponse.json({
    success: true,
    data: items.map((item) => toDisplayItem(item, existingEntities)),
    meta: { hasMore, nextCursor: hasMore && last ? makeCursor(last) : null },
  })
}
