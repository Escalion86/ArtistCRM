import Events from '@models/Events'
import SiteSettings from '@models/SiteSettings'
import Clients from '@models/Clients'
import Transactions from '@models/Transactions'
import Services from '@models/Services'
import Users from '@models/Users'
import Tariffs from '@models/Tariffs'
import dbConnect from './dbConnect'
import mongoose from 'mongoose'

let tenantBackfillApplied = false

const ensureLegacyTenantBackfill = async (tenantObjectId) => {
  if (tenantBackfillApplied) return
  tenantBackfillApplied = true

  await Promise.all([
    Clients.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: tenantObjectId } }
    ),
    Events.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: tenantObjectId } }
    ),
    Transactions.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: tenantObjectId } }
    ),
    Services.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: tenantObjectId } }
    ),
    SiteSettings.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: tenantObjectId } }
    ),
  ])
}

const PAST_EVENTS_INITIAL_LIMIT = 120

const buildEventsPayload = async (tenantId, page) => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  if (page === 'eventsPast') {
    const pastBaseQuery = {
      tenantId,
      eventDate: { $lt: startOfToday },
    }
    const [totalCount, rows] = await Promise.all([
      Events.countDocuments(pastBaseQuery),
      Events.find(pastBaseQuery)
        .sort({ eventDate: -1, createdAt: -1 })
        .limit(PAST_EVENTS_INITIAL_LIMIT + 1)
        .lean(),
    ])
    const hasMore = rows.length > PAST_EVENTS_INITIAL_LIMIT
    const items = hasMore ? rows.slice(0, PAST_EVENTS_INITIAL_LIMIT) : rows
    const lastItem = items[items.length - 1]
    return {
      events: items,
      paging: {
        scope: 'past',
        hasMore,
        nextBefore: lastItem?.eventDate
          ? new Date(lastItem.eventDate).toISOString()
          : null,
        limit: PAST_EVENTS_INITIAL_LIMIT,
        totalCount,
      },
    }
  }

  if (page === 'eventsUpcoming') {
    const items = await Events.find({
      tenantId,
      $or: [
        { eventDate: { $gte: startOfToday } },
        { eventDate: null },
        { eventDate: { $exists: false } },
      ],
    })
      .sort({ eventDate: -1, createdAt: -1 })
      .lean()
    return {
      events: items,
      paging: {
        scope: 'upcoming',
        hasMore: false,
        nextBefore: null,
        limit: 0,
        totalCount: items.length,
      },
    }
  }

  return {
    events: await Events.find({ tenantId }).lean(),
    paging: {
      scope: 'all',
      hasMore: false,
      nextBefore: null,
      limit: 0,
      totalCount: 0,
    },
  }
}

const fetchProps = async (user, page = 'eventsUpcoming') => {
  const serverDateTime = new Date()
  try {
    const db = await dbConnect()
    const tenantId = user?.tenantId || user?._id || null

    if (!tenantId) {
      return {
        clients: [],
        events: [],
        eventsPaging: {
          scope: 'all',
          hasMore: false,
          nextBefore: null,
          limit: 0,
          totalCount: 0,
        },
        siteSettings: {},
        transactions: [],
        services: [],
        tariffs: [],
        serverSettings: JSON.parse(
          JSON.stringify({
            dateTime: serverDateTime,
          })
        ),
        error: { message: 'Не удалось определить пользователя' },
      }
    }

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId)

    await ensureLegacyTenantBackfill(tenantObjectId)

    const canManageAllUsers = ['dev', 'admin'].includes(user?.role)
    const usersQuery = canManageAllUsers ? {} : { tenantId }

    const [
      eventsPayload,
      clients,
      siteSettings,
      transactions,
      services,
      tariffs,
      users,
      loggedUser,
    ] = await Promise.all([
      buildEventsPayload(tenantId, page),
      Clients.find({ tenantId }).select('-password').lean(),
      SiteSettings.findOne({ tenantId }).lean(),
      Transactions.find({ tenantId }).lean(),
      Services.find({ tenantId }).lean(),
      Tariffs.find({}).sort({ price: 1, title: 1 }).lean(),
      Users.find(usersQuery).select('-password').lean(),
      user?._id ? Users.findById(user._id).select('-password').lean() : null,
    ])

    const fetchResult = {
      loggedUser: JSON.parse(JSON.stringify(loggedUser ?? user ?? null)),
      clients: JSON.parse(JSON.stringify(clients)),
      events: JSON.parse(JSON.stringify(eventsPayload.events)),
      eventsPaging: JSON.parse(JSON.stringify(eventsPayload.paging)),
      siteSettings: JSON.parse(
        JSON.stringify(siteSettings ?? {})
      ),
      transactions: JSON.parse(JSON.stringify(transactions)),
      services: JSON.parse(JSON.stringify(services)),
      tariffs: JSON.parse(JSON.stringify(tariffs)),
      users: JSON.parse(JSON.stringify(users)),
      serverSettings: JSON.parse(
        JSON.stringify({
          dateTime: serverDateTime,
        })
      ),
    }

    return fetchResult
  } catch (error) {
    return {
      loggedUser: JSON.parse(JSON.stringify(user ?? null)),
      clients: [],
      events: [],
      eventsPaging: {
        scope: 'all',
        hasMore: false,
        nextBefore: null,
        limit: 0,
        totalCount: 0,
      },
      siteSettings: {},
      transactions: [],
      services: [],
      tariffs: [],
      users: [],
      serverSettings: JSON.parse(
        JSON.stringify({
          dateTime: serverDateTime,
        })
      ),
      error: JSON.parse(JSON.stringify(error)),
    }
  }
}

export default fetchProps
