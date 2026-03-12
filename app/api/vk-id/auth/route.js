import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import { ensureVkUser } from '@server/ensureVkUser'
import { createVkIdAuthToken } from '@server/vkidAuthToken'
import getAuthSecret from '@server/getAuthSecret'

const VK_API_VERSION = '5.199'

const buildError = (code, status, message) =>
  NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  )

const normalizeEmail = (value) => {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

const fetchVkProfile = async (accessToken, userId) => {
  if (!accessToken || !userId) return null
  const url = new URL('https://api.vk.com/method/users.get')
  url.searchParams.set('user_ids', String(userId))
  url.searchParams.set('fields', 'photo_200')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('v', VK_API_VERSION)
  const response = await fetch(url.toString(), { method: 'GET' })
  const json = await response.json().catch(() => ({}))
  const user = Array.isArray(json?.response) ? json.response[0] : null
  if (!user?.id) return null
  return {
    vkId: String(user.id),
    firstName: user.first_name || '',
    secondName: user.last_name || '',
    image: user.photo_200 || '',
  }
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const accessToken = String(body?.access_token || body?.accessToken || '').trim()
  const vkUserId = String(body?.user_id || body?.userId || '').trim()
  const email = normalizeEmail(body?.email)

  if (!accessToken || !vkUserId) {
    return buildError(
      'INVALID_VK_PAYLOAD',
      400,
      'Некорректные данные VK ID'
    )
  }

  try {
    const vkProfile = await fetchVkProfile(accessToken, vkUserId)
    if (!vkProfile?.vkId) {
      console.error('[vk-id/auth] profile not found', {
        vkUserId,
        hasEmail: Boolean(email),
      })
      return buildError('VK_PROFILE_NOT_FOUND', 401, 'Профиль VK не найден')
    }

    await dbConnect()
    const user = await ensureVkUser({
      ...vkProfile,
      email,
    })
    if (!user?._id) {
      console.error('[vk-id/auth] ensureVkUser returned empty user', {
        vkId: vkProfile.vkId,
        hasEmail: Boolean(email),
      })
      return buildError(
        'VK_USER_CREATE_FAILED',
        500,
        'Не удалось создать или найти пользователя'
      )
    }

    const authSecret = getAuthSecret()

    const authToken = createVkIdAuthToken(user._id, authSecret)
    return NextResponse.json(
      {
        success: true,
        data: {
          authToken,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const errorCode =
      error?.code === 11000
        ? 'VK_USER_DUPLICATE_CONFLICT'
        : error?.message?.includes('NEXTAUTH_SECRET')
          ? 'AUTH_SECRET_NOT_SET'
          : 'VK_ID_AUTH_FAILED'

    console.error('[vk-id/auth] error', {
      errorCode,
      message: error?.message,
      name: error?.name,
      code: error?.code,
    })

    return buildError(
      errorCode,
      500,
      'Не удалось авторизоваться через VK ID'
    )
  }
}
