import { NextResponse } from 'next/server'
import { getPartyClientModel, getPartyOrderModel } from '@server/partyModels'
import {
  getPartyRequestContext,
  isValidObjectId,
  parseJsonBody,
  partyError,
} from '@server/partyApi'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const pickClientPatch = (body) => {
  const patch = {}

  if (typeof body.firstName === 'string') patch.firstName = body.firstName.trim()
  if (typeof body.secondName === 'string') patch.secondName = body.secondName.trim()
  if (typeof body.thirdName === 'string') patch.thirdName = body.thirdName.trim()
  if (body.phone !== undefined) patch.phone = normalizePhone(body.phone)
  if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase()
  if (typeof body.comment === 'string') patch.comment = body.comment.trim()
  if (body.status === 'active' || body.status === 'archived') {
    patch.status = body.status
  }

  return patch
}

const syncClientSnapshotInOrders = async ({ tenantId, clientId, client }) => {
  const PartyOrders = await getPartyOrderModel()
  await PartyOrders.updateMany(
    { tenantId, clientId },
    {
      $set: {
        client: {
          name: [client.firstName, client.secondName, client.thirdName]
            .filter(Boolean)
            .join(' '),
          phone: client.phone || '',
          email: client.email || '',
        },
      },
    }
  )
}

const getId = async (params) => {
  const resolved = await params
  return resolved?.id
}

export async function GET(req, { params }) {
  const { context, error } = await getPartyRequestContext({ req })
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_client_id', 'Некорректный id')
  }

  const PartyClients = await getPartyClientModel()
  const client = await PartyClients.findOne({
    _id: id,
    tenantId: context.tenantId,
    status: { $ne: 'archived' },
  }).lean()

  if (!client) {
    return partyError(404, 'partycrm_client_not_found', 'Клиент не найден')
  }

  return NextResponse.json({ success: true, data: client })
}

export async function PATCH(req, { params }) {
  const { context, error } = await getPartyRequestContext({
    req,
    managementOnly: true,
  })
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_client_id', 'Некорректный id')
  }

  const body = await parseJsonBody(req)
  const patch = pickClientPatch(body)

  if (patch.firstName === '') {
    return partyError(
      400,
      'partycrm_client_first_name_required',
      'Укажите имя клиента',
      'validation'
    )
  }

  const PartyClients = await getPartyClientModel()
  const client = await PartyClients.findOneAndUpdate(
    { _id: id, tenantId: context.tenantId },
    { $set: patch },
    { returnDocument: 'after' }
  ).lean()

  if (!client) {
    return partyError(404, 'partycrm_client_not_found', 'Клиент не найден')
  }

  await syncClientSnapshotInOrders({
    tenantId: context.tenantId,
    clientId: client._id,
    client,
  })

  return NextResponse.json({ success: true, data: client })
}

export async function DELETE(req, { params }) {
  const { context, error } = await getPartyRequestContext({
    req,
    managementOnly: true,
  })
  if (error) return error

  const id = await getId(params)
  if (!isValidObjectId(id)) {
    return partyError(400, 'partycrm_invalid_client_id', 'Некорректный id')
  }

  const PartyClients = await getPartyClientModel()
  const client = await PartyClients.findOneAndUpdate(
    { _id: id, tenantId: context.tenantId },
    { $set: { status: 'archived' } },
    { returnDocument: 'after' }
  ).lean()

  if (!client) {
    return partyError(404, 'partycrm_client_not_found', 'Клиент не найден')
  }

  return NextResponse.json({ success: true, data: client })
}
