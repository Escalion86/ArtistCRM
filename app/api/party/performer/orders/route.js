import { NextResponse } from 'next/server'
import { getPartyLocationModel, getPartyOrderModel } from '@server/partyModels'
import { getPartyRequestContext } from '@server/partyApi'

const sanitizeOrderForPerformer = (order, staffId, locationsById) => {
  const assignment = (order.assignedStaff ?? []).find(
    (item) => String(item.staffId) === staffId
  )
  const location = order.locationId
    ? locationsById.get(String(order.locationId))
    : null

  return {
    _id: String(order._id),
    title: order.title || order.serviceTitle || 'Заказ',
    status: order.status,
    eventDate: order.eventDate,
    dateEnd: order.dateEnd,
    placeType: order.placeType,
    location: location
      ? {
          _id: String(location._id),
          title: location.title,
          address: location.address,
        }
      : null,
    customAddress: order.customAddress || '',
    serviceTitle: order.serviceTitle || '',
    client: {
      name: order.client?.name || '',
      phone: order.client?.phone || '',
    },
    adminComment: order.adminComment || '',
    assignment: assignment
      ? {
          role: assignment.role,
          payoutAmount: assignment.payoutAmount || 0,
          payoutStatus: assignment.payoutStatus,
          confirmationStatus: assignment.confirmationStatus,
        }
      : null,
  }
}

export async function GET() {
  const { context, error } = await getPartyRequestContext()
  if (error) return error

  const staffId = String(context.staff._id)
  const PartyOrders = await getPartyOrderModel()
  const orders = await PartyOrders.find({
    tenantId: context.tenantId,
    status: { $nin: ['canceled', 'closed'] },
    'assignedStaff.staffId': staffId,
  })
    .sort({ eventDate: 1, createdAt: -1 })
    .limit(120)
    .lean()

  const locationIds = [
    ...new Set(orders.map((order) => String(order.locationId || '')).filter(Boolean)),
  ]
  const PartyLocations = await getPartyLocationModel()
  const locations = locationIds.length
    ? await PartyLocations.find({
        _id: { $in: locationIds },
        tenantId: context.tenantId,
      }).lean()
    : []
  const locationsById = new Map(
    locations.map((location) => [String(location._id), location])
  )

  return NextResponse.json({
    success: true,
    data: orders.map((order) =>
      sanitizeOrderForPerformer(order, staffId, locationsById)
    ),
  })
}
