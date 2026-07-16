import { NextResponse } from 'next/server'

export const mobileError = (code, message, status = 400, field) =>
  NextResponse.json(
    {
      success: false,
      error: {
        code,
        type:
          status === 401
            ? 'auth'
            : status === 429
              ? 'rate_limit'
              : status >= 500
                ? 'server'
                : 'validation',
        message,
        ...(field ? { field } : {}),
      },
    },
    { status }
  )

export const getMobileDevice = (req, body = {}) => ({
  deviceId: body?.deviceId || req.headers.get('x-device-id') || '',
  deviceName: body?.deviceName || req.headers.get('x-device-name') || '',
  platform: body?.platform || req.headers.get('x-device-platform') || 'android',
  appVersion: body?.appVersion || req.headers.get('x-app-version') || '',
})

export const mobileSuccess = (data, status = 200) =>
  NextResponse.json({ success: true, data }, { status })
