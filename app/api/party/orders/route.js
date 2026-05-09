import { NextResponse } from 'next/server'
import {
  getPartyLocationModel,
  getPartyOrderModel,
  getPartyStaffModel,
} from '@server/partyModels'
import {
  getPartyRequestContext,
  isValidObjectId,
  parseJsonBody,
  partyError,
} from '@server/partyApi'
import {
  findPartyOrderConflicts,
  hasPartyOrderConflicts,
} from '@server/partyOrderConflicts'

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseMoney = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0
}

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const normalizeAssignedStaff = (items) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  return items
    .map((item) => {
      const staffId = String(item?.staffId || '').trim()
      if (!isValidObjectId(staffId) || seen.has(staffId)) return null
      seen.add(staffId)
      return {
        staffId,
        role: ['performer', 'admin', 'assistant'].includes(item.role)
          ? item.role
          : 'performer',
        payoutAmount: parseMoney(item.payoutAmount),
        payoutStatus: 'planned',
        confirmationStatus: 'pending',
      }
    })
    .filter(Boolean)
}

export const normalizeOrderPayload = (body) => {
  const placeType =
    body.placeType === 'client_address' ? 'client_address' : 'company_location'
  const locationId =
    placeType === 'company_location' && isValidObjectId(body.locationId)
      ? String(body.locationId)
      : null

  return {
    title: typeof body.title === 'string' ? body.title.trim() : '',
    status: ['draft', 'active', 'canceled', 'closed'].includes(body.status)
      ? body.status
      : 'draft',
    client: {
      name: typeof body.client?.name === 'string' ? body.client.name.trim() : '',
      phone: normalizePhone(body.client?.phone),
      email:
        typeof body.client?.email === 'string'
          ? body.client.email.trim().toLowerCase()
          : '',
    },
    eventDate: parseDate(body.eventDate),
    dateEnd: parseDate(body.dateEnd),
    placeType,
    locationId,
    customAddress:
      typeof body.customAddress === 'string' ? body.customAddress.trim() : '',
    serviceTitle:
      typeof body.serviceTitle === 'string' ? body.serviceTitle.trim() : '',
    clientPayment: {
      totalAmount: parseMoney(body.clientPayment?.totalAmount),
      prepaidAmount: parseMoney(body.clientPayment?.prepaidAmount),
      status: ['none', 'wait_prepayment', 'prepaid', 'paid'].includes(
        body.clientPayment?.status
      )
        ? body.clientPayment.status
        : 'none',
    },
    assignedStaff: normalizeAssignedStaff(body.assignedStaff),
    adminComment:
      typeof body.adminComment === 'string' ? body.adminComment.trim() : '',
  }
}

export const validateOrderReferences = async ({ tenantId, payload }) => {
  if (payload.locationId) {
    const PartyLocations = await getPartyLocationModel()
    const exists = await PartyLocations.exists({
      _id: payload.locationId,
      tenantId,
      status: { $ne: 'archived' },
    })
    if (!exists) {
      return partyError(
        400,
        'partycrm_location_not_found',
        'Выбранная точка не найдена',
        'validation'
      )
    }
  }

  if (payload.assignedStaff.length > 0) {
    const ids = payload.assignedStaff.map((item) => item.staffId)
    const PartyStaff = await getPartyStaffModel()
    const count = await PartyStaff.countDocuments({
      _id: { $in: ids },
      tenantId,
      status: { $ne: 'archived' },
    })
    if (count !== ids.length) {
      return partyError(
        400,
        'partycrm_staff_not_found',
        'Один или несколько исполнителей не найдены',
        'validation'
      )
    }
  }

  return null
}

export async function GET() {
  const { context, error } = await getPartyRequestContext()
  if (error) return error

  const PartyOrders = await getPartyOrderModel()
  const orders = await PartyOrders.find({
    tenantId: context.tenantId,
    status: { $ne: 'canceled' },
  })
    .sort({ eventDate: 1, createdAt: -1 })
    .limit(120)
    .lean()

  return NextResponse.json({ success: true, data: orders })
}

export async function POST(req) {
  const { context, error } = await getPartyRequestContext({
    managementOnly: true,
  })
  if (error) return error

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

  const order = await PartyOrders.create({
    ...payload,
    tenantId: context.tenantId,
  })

  return NextResponse.json({ success: true, data: order }, { status: 201 })
}
