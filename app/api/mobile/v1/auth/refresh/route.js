import { rotateMobileSession } from '@server/mobile/sessions'
import {
  getMobileDevice,
  mobileError,
  mobileSuccess,
} from '@server/mobile/routeHelpers'

export const POST = async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const refreshToken = String(body?.refreshToken || '')
    if (!refreshToken) {
      return mobileError('REFRESH_TOKEN_REQUIRED', 'Сессия не найдена', 401)
    }

    const session = await rotateMobileSession({
      refreshToken,
      device: getMobileDevice(req, body),
    })
    if (!session) {
      return mobileError('SESSION_EXPIRED', 'Сессия истекла', 401)
    }
    return mobileSuccess(session)
  } catch (error) {
    console.error('[mobile/v1/auth/refresh]', error)
    return mobileError('REFRESH_FAILED', 'Не удалось обновить сессию', 500)
  }
}
