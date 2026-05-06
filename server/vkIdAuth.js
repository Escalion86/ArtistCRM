import { isValidNormalizedPhone, normalizePhone } from '@server/phoneVerification'

const VK_ID_DOMAIN = process.env.VK_ID_DOMAIN || 'id.vk.ru'

const getVkIdBaseUrl = () => `https://${VK_ID_DOMAIN.replace(/^https?:\/\//, '')}`

const normalizeEmail = (value) => {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

const normalizeVkPhone = (value) => {
  const phone = normalizePhone(value)
  return isValidNormalizedPhone(phone) ? phone : ''
}

const buildResult = (success, data) => ({ success, data })

const buildError = (type, message, details = {}) =>
  buildResult(false, {
    error: {
      type,
      message,
      ...details,
    },
  })

const toFormBody = (data = {}) => {
  const form = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    form.append(key, String(value))
  })
  return form
}

const vkOAuthRequest = async ({ path, query = {}, body = {} }) => {
  const url = new URL(`${getVkIdBaseUrl()}${path}`)
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toFormBody(body),
    cache: 'no-store',
  })
  const json = await response.json().catch(() => ({}))
  return { response, json }
}

export const exchangeVkCode = async ({
  code,
  deviceId,
  codeVerifier,
  state,
} = {}) => {
  const appId = process.env.VK_ID_APP_ID || process.env.NEXT_PUBLIC_VK_ID_APP_ID
  const redirectUri = process.env.VK_ID_REDIRECT_URI

  if (!appId || !process.env.VK_ID_CLIENT_SECRET || !redirectUri) {
    return buildError(
      'VK_CONFIG_MISSING',
      'VK ID auth is not configured on the server'
    )
  }

  if (!code || !deviceId) {
    return buildError('INVALID_VK_PAYLOAD', 'VK ID payload is incomplete')
  }

  const { response, json } = await vkOAuthRequest({
    path: '/oauth2/auth',
    query: {
      client_id: appId,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      device_id: deviceId,
      state: state || 'vkid_state',
      code_verifier: codeVerifier,
    },
    body: { code },
  })

  if (!response.ok || json?.error) {
    return buildError('VK_EXCHANGE_FAILED', 'VK ID code exchange failed', {
      vkError: json?.error || '',
      vkErrorDescription: json?.error_description || '',
    })
  }

  const accessToken = json?.access_token || json?.accessToken || ''
  if (!accessToken) {
    return buildError('VK_EXCHANGE_FAILED', 'VK ID token is missing')
  }

  return buildResult(true, {
    accessToken,
    idToken: json?.id_token || '',
    userId: json?.user_id || json?.userId || '',
    expiresIn: json?.expires_in || null,
  })
}

export const fetchVkUserInfo = async ({ accessToken } = {}) => {
  const appId = process.env.VK_ID_APP_ID || process.env.NEXT_PUBLIC_VK_ID_APP_ID

  if (!appId) {
    return buildError(
      'VK_CONFIG_MISSING',
      'VK ID app id is not configured on the server'
    )
  }

  if (!accessToken) {
    return buildError('INVALID_VK_PAYLOAD', 'VK ID access token is missing')
  }

  const { response, json } = await vkOAuthRequest({
    path: '/oauth2/user_info',
    query: {
      client_id: appId,
    },
    body: {
      access_token: accessToken,
    },
  })

  if (!response.ok || json?.error) {
    return buildError('VK_USERINFO_FAILED', 'VK ID user info request failed', {
      vkError: json?.error || '',
      vkErrorDescription: json?.error_description || '',
    })
  }

  const user = json?.user || json?.data?.user || json?.data || json || {}
  const phone = normalizeVkPhone(user?.phone || user?.phone_number)

  if (!phone) {
    return buildError('VK_PHONE_REQUIRED', 'VK ID profile has no phone number')
  }

  return buildResult(true, {
    vkId: String(user?.user_id || user?.id || user?.sub || '').trim(),
    phone,
    email: normalizeEmail(user?.email),
    firstName: user?.first_name || user?.firstName || '',
    secondName: user?.last_name || user?.lastName || '',
    image: user?.avatar || user?.photo_200 || user?.picture || '',
  })
}
