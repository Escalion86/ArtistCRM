import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import { ensureVkUser } from '@server/ensureVkUser'
import { createVkIdAuthToken } from '@server/vkidAuthToken'

const VK_API_VERSION = '5.199'

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
    return NextResponse.json(
      { success: false, error: 'INVALID_VK_PAYLOAD' },
      { status: 400 }
    )
  }

  try {
    const vkProfile = await fetchVkProfile(accessToken, vkUserId)
    if (!vkProfile?.vkId) {
      return NextResponse.json(
        { success: false, error: 'VK_PROFILE_NOT_FOUND' },
        { status: 401 }
      )
    }

    await dbConnect()
    const user = await ensureVkUser({
      ...vkProfile,
      email,
    })
    if (!user?._id) {
      return NextResponse.json(
        { success: false, error: 'VK_USER_CREATE_FAILED' },
        { status: 500 }
      )
    }

    const authSecret = process.env.NEXTAUTH_SECRET
    if (!authSecret) {
      return NextResponse.json(
        { success: false, error: 'AUTH_SECRET_NOT_SET' },
        { status: 500 }
      )
    }

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
    console.error('[vk-id/auth] error', error)
    return NextResponse.json(
      { success: false, error: 'VK_ID_AUTH_FAILED' },
      { status: 500 }
    )
  }
}

