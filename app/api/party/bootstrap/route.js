import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '../../auth/[...nextauth]/_options'
import {
  PARTY_STAFF_ROLES,
  getPartyCompanyModel,
  getPartyStaffModel,
} from '@server/partyModels'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const normalizeEmail = (email) => {
  if (!email) return ''
  return String(email).trim().toLowerCase()
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user ?? null

  if (!sessionUser?._id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'unauthorized',
          type: 'auth',
          message: 'Не авторизован',
        },
      },
      { status: 401 }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const PartyCompanies = await getPartyCompanyModel()
    const PartyStaff = await getPartyStaffModel()

    const authUserId = String(sessionUser._id)
    const phone = normalizePhone(sessionUser.phone)
    const email = normalizeEmail(sessionUser.email)

    const existingStaff = await PartyStaff.findOne({
      status: { $ne: 'archived' },
      $or: [
        { authUserId },
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    }).lean()

    if (existingStaff?.tenantId) {
      const company = await PartyCompanies.findById(existingStaff.tenantId).lean()
      return NextResponse.json({
        success: true,
        data: {
          created: false,
          tenantId: String(existingStaff.tenantId),
          company,
          staff: existingStaff,
        },
      })
    }

    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : 'Моя компания'

    const company = await PartyCompanies.create({
      title,
      phone,
      email,
      status: 'active',
    })

    company.tenantId = company._id
    await company.save()

    const staff = await PartyStaff.create({
      tenantId: company._id,
      authUserId,
      phone,
      email,
      firstName: sessionUser.firstName || '',
      secondName: sessionUser.secondName || '',
      role: PARTY_STAFF_ROLES.OWNER,
      status: 'active',
      lastLoginAt: new Date(),
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          created: true,
          tenantId: String(company._id),
          company,
          staff,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'partycrm_bootstrap_failed',
          type: 'server',
          message: error.message,
        },
      },
      { status: 500 }
    )
  }
}
