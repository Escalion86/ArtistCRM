import { NextResponse } from 'next/server'
import { getPartyOrderModel } from '@server/partyModels'
import {
  getPartyRequestContext,
  isValidObjectId,
  parseJsonBody,
  partyError,
} from '@server/partyApi'
import { normalizeOrderPayload, validateOrderReferences } from '../route'
import {
  findPartyOrderConflicts,
  hasPartyOrderConflicts,
} from '@server/partyOrderConflicts'

const getId = async (params) => {
  const resolved = await params
  return resolved?.id
}

export async function GET(_req, { params }) {
  const { context, error } = await getPartyRequestContext()
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_order_id', 'Некорректный id')
  }

  const PartyOrders = await getPartyOrderModel()
  const order = await PartyOrders.findOne({
    _id: id,
    tenantId: context.tenantId,
  }).lean()

  if (!order) {
    return partyError(404, 'partycrm_order_not_found', 'Заказ не найден')
  }

  return NextResponse.json({ success: true, data: order })
}

export async function PATCH(req, { params }) {
  const { context, error } = await getPartyRequestContext({
    managementOnly: true,
  })
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_order_id', 'Некорректный id')
  }

  const body = await parseJsonBody(req)
  const payload = normalizeOrderPayload(body)

  if (!payload.title && !payload.client.name && !payload.serviceTitle) {
    return partyError(
      400,
      'partycrm_order_title_required',
      'Укажите название, клиента или услугу заказа',
      'validation'
    )
  }

  const referenceError = await validateOrderReferences({
    tenantId: context.tenantId,
    payload,
  })
  if (referenceError) return referenceError

  const PartyOrders = await getPartyOrderModel()
  const conflicts = await findPartyOrderConflicts({
    PartyOrders,
    tenantId: context.tenantId,
    payload,
    excludeOrderId: id,
  })
  if (hasPartyOrderConflicts(conflicts)) {
    return partyError(
      409,
      'partycrm_order_conflict',
      'Найдены пересечения по точке или исполнителю',
      'validation',
      { conflicts }
    )
  }

  const order = await PartyOrders.findOneAndUpdate(
    { _id: id, tenantId: context.tenantId },
    { $set: payload },
    { returnDocument: 'after' }
  ).lean()

  if (!order) {
    return partyError(404, 'partycrm_order_not_found', 'Заказ не найден')
  }

  return NextResponse.json({ success: true, data: order })
}

export async function DELETE(_req, { params }) {
  const { context, error } = await getPartyRequestContext({
    managementOnly: true,
  })
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_order_id', 'Некорректный id')
  }

  const PartyOrders = await getPartyOrderModel()
  const order = await PartyOrders.findOneAndUpdate(
    { _id: id, tenantId: context.tenantId },
    { $set: { status: 'canceled' } },
    { returnDocument: 'after' }
  ).lean()

  if (!order) {
    return partyError(404, 'partycrm_order_not_found', 'Заказ не найден')
  }

  return NextResponse.json({ success: true, data: order })
}
