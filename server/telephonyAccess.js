import Users from '@models/Users'
import getTenantContext from '@server/getTenantContext'

const DEV_ONLY_ERROR = 'Функция IP-телефонии и AI-заявок доступна только разработчику'

export const requireTelephonyDevAccess = async () => {
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return {
      ok: false,
      status: 401,
      error: 'Не авторизован',
      tenantId: null,
      user: null,
    }
  }

  if (user?.role !== 'dev') {
    return {
      ok: false,
      status: 403,
      error: DEV_ONLY_ERROR,
      tenantId,
      user,
    }
  }

  return {
    ok: true,
    status: 200,
    error: '',
    tenantId,
    user,
  }
}

export const isTelephonyTenantAllowed = async (tenantId) => {
  if (!tenantId) return false
  const owner = await Users.findById(tenantId).select('role').lean()
  return owner?.role === 'dev'
}
