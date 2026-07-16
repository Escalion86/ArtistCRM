import getTenantContext from '@server/getTenantContext'
import { getMobileUser } from '@server/mobile/auth'

const getRequestContext = async (req) => {
  const authorization = req?.headers?.get?.('authorization') || ''
  if (authorization.startsWith('Bearer ')) {
    const mobile = await getMobileUser(req)
    if (!mobile?.user) {
      return {
        session: null,
        user: null,
        tenantId: null,
        mobileSessionId: null,
        authType: 'mobile',
        error: mobile?.error || 'Не авторизован',
      }
    }
    return {
      session: null,
      user: mobile.user,
      tenantId: mobile.user.tenantId,
      mobileSessionId: mobile.sessionId || null,
      authType: 'mobile',
      error: null,
    }
  }

  const context = await getTenantContext()
  return {
    ...context,
    mobileSessionId: null,
    authType: 'web',
    error: context?.tenantId ? null : 'Не авторизован',
  }
}

export default getRequestContext
