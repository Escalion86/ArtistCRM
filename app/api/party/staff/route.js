import { NextResponse } from 'next/server'
import { getPartyStaffModel } from '@server/partyModels'
import {
  getPartyRequestContext,
  parseJsonBody,
  partyError,
} from '@server/partyApi'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const normalizeEmail = (email) => {
  if (!email) return ''
  return String(email).trim().toLowerCase()
}

const normalizeStaffPayload = (body) => ({
  authUserId: typeof body.authUserId === 'string' ? body.authUserId.trim() : '',
  firstName: typeof body.firstName === 'string' ? body.firstName.trim() : '',
  secondName: typeof body.secondName === 'string' ? body.secondName.trim() : '',
  phone: normalizePhone(body.phone),
  email: normalizeEmail(body.email),
  role: ['owner', 'admin', 'performer'].includes(body.role)
    ? body.role
    : 'performer',
  status: ['active', 'invited', 'paused', 'archived'].includes(body.status)
    ? body.status
    : 'active',
  visibleToPerformer:
    typeof body.visibleToPerformer === 'boolean'
      ? body.visibleToPerformer
      : true,
})

export async function GET(req) {
  const { context, error } = await getPartyRequestContext({
    req,
    managementOnly: true,
  })
  if (error) return error

  const PartyStaff = await getPartyStaffModel()
  const staff = await PartyStaff.find({
    tenantId: context.tenantId,
    status: { $ne: 'archived' },
  })
    .sort({ role: 1, secondName: 1, firstName: 1, createdAt: 1 })
    .lean()

  return NextResponse.json({ success: true, data: staff })
}

export async function POST(req) {
  const { context, error } = await getPartyRequestContext({
    req,
    managementOnly: true,
  })
  if (error) return error

  const body = await parseJsonBody(req)
  const payload = normalizeStaffPayload(body)

  if (!payload.firstName && !payload.secondName && !payload.phone && !payload.email) {
    return partyError(
      400,
      'partycrm_staff_contact_required',
      'Укажите имя, телефон или email сотрудника',
      'validation'
    )
  }

  const PartyStaff = await getPartyStaffModel()
  const staff = await PartyStaff.create({
    ...payload,
    tenantId: context.tenantId,
  })

  return NextResponse.json({ success: true, data: staff }, { status: 201 })
}
