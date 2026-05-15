import { NextResponse } from 'next/server'
import { getPartyClientModel } from '@server/partyModels'
import {
  getPartyRequestContext,
  parseJsonBody,
  partyError,
} from '@server/partyApi'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const normalizeClientPayload = (body) => ({
  firstName:
    typeof body.firstName === 'string' ? body.firstName.trim() : '',
  secondName:
    typeof body.secondName === 'string' ? body.secondName.trim() : '',
  thirdName:
    typeof body.thirdName === 'string' ? body.thirdName.trim() : '',
  phone: normalizePhone(body.phone),
  email:
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
  comment: typeof body.comment === 'string' ? body.comment.trim() : '',
  status: body.status === 'archived' ? 'archived' : 'active',
})

export async function GET(req) {
  const { context, error } = await getPartyRequestContext({
    req,
    managementOnly: true,
  })
  if (error) return error

  const status = req.nextUrl.searchParams.get('status')
  const statusFilter =
    status === 'archived' ? { status: 'archived' } : { status: { $ne: 'archived' } }

  const PartyClients = await getPartyClientModel()
  const clients = await PartyClients.find({
    tenantId: context.tenantId,
    ...statusFilter,
  })
    .sort({ firstName: 1, secondName: 1, createdAt: -1 })
    .lean()

  return NextResponse.json({ success: true, data: clients })
}

export async function POST(req) {
  const { context, error } = await getPartyRequestContext({
    req,
    managementOnly: true,
  })
  if (error) return error

  const body = await parseJsonBody(req)
  const payload = normalizeClientPayload(body)

  if (!payload.firstName) {
    return partyError(
      400,
      'partycrm_client_first_name_required',
      'Укажите имя клиента',
      'validation'
    )
  }

  const PartyClients = await getPartyClientModel()
  const client = await PartyClients.create({
    ...payload,
    tenantId: context.tenantId,
  })

  return NextResponse.json({ success: true, data: client }, { status: 201 })
}
