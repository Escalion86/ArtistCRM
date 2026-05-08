import { getServerSession } from 'next-auth'
import authOptions from '../app/api/auth/[...nextauth]/_options'
import { getPartyCompanyModel, getPartyStaffModel } from './partyModels'

const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d]/g, '')
}

const normalizeEmail = (email) => {
  if (!email) return ''
  return String(email).trim().toLowerCase()
}

const sanitizeStaff = (staff) => {
  if (!staff) return null
  const data = typeof staff.toObject === 'function' ? staff.toObject() : staff
  return {
    ...data,
    _id: String(data._id),
    tenantId: data.tenantId ? String(data.tenantId) : null,
  }
}

const sanitizeCompany = (company) => {
  if (!company) return null
  const data =
    typeof company.toObject === 'function' ? company.toObject() : company
  return {
    ...data,
    _id: String(data._id),
    tenantId: data.tenantId ? String(data.tenantId) : null,
  }
}

const buildStaffQuery = (sessionUser) => {
  const authUserId = sessionUser?._id ? String(sessionUser._id) : ''
  const phone = normalizePhone(sessionUser?.phone)
  const email = normalizeEmail(sessionUser?.email)
  const conditions = []

  if (authUserId) conditions.push({ authUserId })
  if (phone) conditions.push({ phone })
  if (email) conditions.push({ email })

  return conditions.length > 0
    ? {
        status: { $ne: 'archived' },
        $or: conditions,
      }
    : null
}

const getPartyTenantContext = async () => {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user ?? null
  const staffQuery = buildStaffQuery(sessionUser)

  if (!sessionUser?._id || !staffQuery) {
    return {
      session,
      sessionUser,
      staff: null,
      company: null,
      tenantId: null,
      role: null,
    }
  }

  const PartyStaff = await getPartyStaffModel()
  const PartyCompanies = await getPartyCompanyModel()
  const staff = await PartyStaff.findOne(staffQuery).lean()
  const tenantId = staff?.tenantId ? String(staff.tenantId) : null
  const company = tenantId
    ? await PartyCompanies.findOne({
        _id: tenantId,
        status: { $ne: 'archived' },
      }).lean()
    : null

  return {
    session,
    sessionUser,
    staff: sanitizeStaff(staff),
    company: sanitizeCompany(company),
    tenantId: company?._id ? String(company._id) : null,
    role: staff?.role ?? null,
  }
}

export default getPartyTenantContext
