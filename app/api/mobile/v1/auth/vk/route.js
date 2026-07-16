import { POST as vkAuth } from '../../../../vk-id/auth/route'
import Users from '@models/Users'
import getAuthSecret from '@server/getAuthSecret'
import { verifyVkIdAuthToken } from '@server/vkidAuthToken'
import { createMobileSession } from '@server/mobile/sessions'
import {
  getMobileDevice,
  mobileError,
  mobileSuccess,
} from '@server/mobile/routeHelpers'

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const vkRequest = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({
      ...body,
      mobileFlow: body?.mode === 'register' ? 'register' : 'login',
    }),
  })
  const response = await vkAuth(vkRequest)
  if (!response.ok) return response
  const result = await response.json()
  const payload = verifyVkIdAuthToken(result?.data?.authToken, getAuthSecret())
  if (!payload?.uid) return mobileError('VK_AUTH_FAILED', 'Ошибка входа через VK ID', 401)
  const user = await Users.findById(payload.uid)
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)
  const session = await createMobileSession({
    user,
    device: getMobileDevice(req, body),
  })
  return mobileSuccess(session)
}
