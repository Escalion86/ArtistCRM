import { POST as finalizePhone } from '../../../../phone/verify/finalize/route'
import { findUserByPhone, normalizePhone } from '@server/phoneVerification'
import { createMobileSession } from '@server/mobile/sessions'
import {
  getMobileDevice,
  mobileError,
  mobileSuccess,
} from '@server/mobile/routeHelpers'

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const finalizeRequest = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ ...body, flow: 'register' }),
  })
  const response = await finalizePhone(finalizeRequest)
  if (!response.ok) return response

  const user = await findUserByPhone(normalizePhone(body?.phone))
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 500)
  const session = await createMobileSession({
    user,
    device: getMobileDevice(req, body),
  })
  return mobileSuccess(session, 201)
}
