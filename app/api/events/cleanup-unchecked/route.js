import { NextResponse } from 'next/server'
import Events from '@models/Events'
import Transactions from '@models/Transactions'
import Clients from '@models/Clients'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'

export const POST = async () => {
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  if (!['dev', 'admin'].includes(user?.role)) {
    return NextResponse.json(
      { success: false, error: 'Недостаточно прав' },
      { status: 403 }
    )
  }

  await dbConnect()

  const filter = {
    tenantId,
    importedFromCalendar: true,
    calendarImportChecked: { $ne: true },
  }

  const eventsToDelete = await Events.find(filter)
    .select('_id clientId')
    .lean()
  const eventIds = eventsToDelete.map((event) => event._id)
  const clientIds = eventsToDelete
    .map((event) => event.clientId)
    .filter(Boolean)

  let transactionsResult = null
  if (eventIds.length) {
    transactionsResult = await Transactions.deleteMany({
      tenantId,
      eventId: { $in: eventIds },
    })
  }

  let clientsResult = null
  if (clientIds.length) {
    const clientIdsWithoutOtherEvents = (
      await Promise.all(
        clientIds.map(async (clientId) => {
          const otherEvents = await Events.countDocuments({
            tenantId,
            clientId,
            _id: { $nin: eventIds },
          })
          return otherEvents > 0 ? null : clientId
        })
      )
    ).filter(Boolean)

    clientsResult = await Clients.deleteMany({
      tenantId,
      _id: { $in: clientIdsWithoutOtherEvents },
    })
  }

  const result = await Events.deleteMany(filter)

  const settings = await SiteSettings.findOne({ tenantId })
  if (settings) {
    const remainingEvents = await Events.find({ tenantId })
      .select('address.town')
      .lean()
    const townsSet = new Set(
      remainingEvents
        .map((event) => event?.address?.town)
        .filter((town) => typeof town === 'string' && town.trim())
        .map((town) => town.trim())
    )
    const towns = Array.from(townsSet).sort((a, b) => a.localeCompare(b, 'ru'))
    const defaultTown =
      settings.defaultTown && towns.includes(settings.defaultTown)
        ? settings.defaultTown
        : ''
    settings.towns = towns
    settings.defaultTown = defaultTown
    await settings.save()
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        deleted: result?.deletedCount ?? 0,
        deletedTransactions: transactionsResult?.deletedCount ?? 0,
        deletedClients: clientsResult?.deletedCount ?? 0,
      },
    },
    { status: 200 }
  )
}
