import Clients from '@models/Clients'
import Events from '@models/Events'
import MobileSyncTombstones from '@models/MobileSyncTombstones'
import ServiceGroups from '@models/ServiceGroups'
import Services from '@models/Services'
import Transactions from '@models/Transactions'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import {
  advanceSyncPosition,
  buildSyncPageQuery,
  encodeSyncCursor,
  parseSyncCursor,
} from '@server/mobile/syncCursor'

const MAX_ITEMS_PER_ENTITY = 2000

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }

  await dbConnect()
  const url = new URL(req.url)
  const serverTime = new Date()
  const cursor = parseSyncCursor(url.searchParams.get('cursor'), serverTime)
  const entityQuery = (stream) => buildSyncPageQuery({
    tenantId: context.tenantId,
    position: cursor.positions[stream],
    upperBound: cursor.upperBound,
    dateField: 'updatedAt',
  })
  const tombstoneQuery = buildSyncPageQuery({
    tenantId: context.tenantId,
    position: cursor.positions.tombstones,
    upperBound: cursor.upperBound,
    dateField: 'deletedAt',
  })

  const limit = MAX_ITEMS_PER_ENTITY + 1
  const [eventRows, clientRows, transactionRows, serviceRows, groupRows, tombstoneRows] =
    await Promise.all([
      Events.find(entityQuery('events')).sort({ updatedAt: 1, _id: 1 }).limit(limit).lean(),
      Clients.find(entityQuery('clients')).sort({ updatedAt: 1, _id: 1 }).limit(limit).lean(),
      Transactions.find(entityQuery('transactions'))
        .sort({ updatedAt: 1, _id: 1 })
        .limit(limit)
        .lean(),
      Services.find(entityQuery('services')).sort({ updatedAt: 1, _id: 1 }).limit(limit).lean(),
      ServiceGroups.find(entityQuery('serviceGroups'))
        .sort({ updatedAt: 1, _id: 1 })
        .limit(limit)
        .lean(),
      MobileSyncTombstones.find(tombstoneQuery)
        .sort({ deletedAt: 1, _id: 1 })
        .limit(limit)
        .lean(),
    ])

  const events = eventRows.slice(0, MAX_ITEMS_PER_ENTITY)
  const clients = clientRows.slice(0, MAX_ITEMS_PER_ENTITY)
  const transactions = transactionRows.slice(0, MAX_ITEMS_PER_ENTITY)
  const services = serviceRows.slice(0, MAX_ITEMS_PER_ENTITY)
  const serviceGroups = groupRows.slice(0, MAX_ITEMS_PER_ENTITY)
  const tombstones = tombstoneRows.slice(0, MAX_ITEMS_PER_ENTITY)
  const hasMore = [eventRows, clientRows, transactionRows, serviceRows, groupRows, tombstoneRows]
    .some((items) => items.length > MAX_ITEMS_PER_ENTITY)
  const positions = {
    events: advanceSyncPosition(events, 'updatedAt', cursor.positions.events),
    clients: advanceSyncPosition(clients, 'updatedAt', cursor.positions.clients),
    transactions: advanceSyncPosition(
      transactions,
      'updatedAt',
      cursor.positions.transactions
    ),
    services: advanceSyncPosition(services, 'updatedAt', cursor.positions.services),
    serviceGroups: advanceSyncPosition(
      serviceGroups,
      'updatedAt',
      cursor.positions.serviceGroups
    ),
    tombstones: advanceSyncPosition(
      tombstones,
      'deletedAt',
      cursor.positions.tombstones
    ),
  }

  return mobileSuccess({
    cursor: hasMore
      ? encodeSyncCursor({ upperBound: cursor.upperBound, positions })
      : cursor.upperBound.toISOString(),
    hasMore,
    entities: { events, clients, transactions, services, serviceGroups },
    tombstones: tombstones.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      version: item.version,
      deletedAt: item.deletedAt,
    })),
  })
}
