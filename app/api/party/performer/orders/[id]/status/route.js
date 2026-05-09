import { NextResponse } from 'next/server'
import { getPartyOrderModel } from '@server/partyModels'
import {
  getPartyRequestContext,
  isValidObjectId,
  parseJsonBody,
  partyError,
} from '@server/partyApi'

const ALLOWED_STATUSES = new Set(['confirmed', 'declined', 'done'])

const getId = async (params) => {
  const resolved = await params
  return resolved?.id
}

export async function PATCH(req, { params }) {
  const { context, error } = await getPartyRequestContext()
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_order_id', 'Некорректный id')
  }

  const body = await parseJsonBody(req)
  const confirmationStatus = String(body.confirmationStatus || '').trim()

  if (!ALLOWED_STATUSES.has(confirmationStatus)) {
    return partyError(
      400,
      'partycrm_invalid_confirmation_status',
      'Некорректный статус участия',
      'validation'
    )
  }

  const staffId = String(context.staff._id)
  const PartyOrders = await getPartyOrderModel()
  const order = await PartyOrders.findOneAndUpdate(
    {
      _id: id,
      tenantId: context.tenantId,
      status: { $nin: ['canceled', 'closed'] },
      'assignedStaff.staffId': staffId,
    },
    {
      $set: {
        'assignedStaff.$.confirmationStatus': confirmationStatus,
      },
    },
    { returnDocument: 'after' }
  ).lean()

  if (!order) {
    return partyError(
      404,
      'partycrm_performer_order_not_found',
      'Назначенный заказ не найден'
    )
  }

  const assignment = (order.assignedStaff ?? []).find(
    (item) => String(item.staffId) === staffId
  )

  return NextResponse.json({
    success: true,
    data: {
      orderId: String(order._id),
      confirmationStatus: assignment?.confirmationStatus || confirmationStatus,
    },
  })
}
