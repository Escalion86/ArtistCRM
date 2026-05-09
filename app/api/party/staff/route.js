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

const normalizeText = (value, maxLength = 160) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const normalizeStaffPayload = (body) => {
  const authUserId = normalizeText(body.authUserId)

  return {
    authUserId,
    firstName: normalizeText(body.firstName, 100),
    secondName: normalizeText(body.secondName, 100),
    phone: normalizePhone(body.phone),
    email: normalizeEmail(body.email),
    specialization: [
      '',
      'animator',
      'magician',
      'host',
      'photographer',
      'workshop',
      'other',
    ].includes(body.specialization)
      ? body.specialization
      : '',
    description: normalizeText(body.description, 1000),
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
    linkStatus: ['unlinked', 'link_requested', 'linked', 'rejected'].includes(
      body.linkStatus
    )
      ? body.linkStatus
      : authUserId
        ? 'linked'
        : 'unlinked',
  }
}

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

  if (!payload.authUserId && (!payload.firstName || !payload.phone)) {
    return partyError(
      400,
      'partycrm_staff_contact_required',
      'Для подрядчика без аккаунта укажите имя и телефон',
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
