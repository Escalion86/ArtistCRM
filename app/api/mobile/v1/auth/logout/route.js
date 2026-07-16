import { getMobileUser } from '@server/mobile/auth'
import {
  findMobileSessionForLogout,
  revokeMobileSession,
} from '@server/mobile/sessions'
import { mobileSuccess } from '@server/mobile/routeHelpers'
import { deactivateExpoPushTokenByDevice } from '@server/expoPushNotifications'

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const refreshToken = String(body?.refreshToken || '').trim()
  const refreshSession = await findMobileSessionForLogout(refreshToken)
  const auth = await getMobileUser(req)
  await revokeMobileSession({
    refreshToken,
    sessionId: refreshSession ? undefined : auth?.sessionId,
    userId: refreshSession ? undefined : auth?.user?._id,
  })
  await deactivateExpoPushTokenByDevice({
    tenantId: refreshSession?.tenantId || auth?.user?.tenantId,
    deviceId:
      refreshSession?.deviceId || req.headers.get('x-device-id'),
  })
  return mobileSuccess({ loggedOut: true })
}
