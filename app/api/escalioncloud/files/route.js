import { NextResponse } from 'next/server'
import getTenantContext from '@server/getTenantContext'

export const runtime = 'nodejs'

const ESCALIONCLOUD_FILES_API_URL = 'https://cloud.escalion.ru/api/files'

const buildError = (type, message) => ({
  success: false,
  data: {
    error: {
      type,
      message,
    },
  },
})

const parseBoolean = (value) =>
  value === 'true' || value === '1' || value === true

const parseUpstreamResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export async function GET(request) {
  const { user } = await getTenantContext()
  if (!user?._id) {
    return NextResponse.json(buildError('UNAUTHORIZED', 'Unauthorized'), {
      status: 401,
    })
  }

  const password = process.env.ESCALIONCLOUD_PASSWORD
  if (!password) {
    return NextResponse.json(
      buildError(
        'CONFIG_ERROR',
        'ESCALIONCLOUD_PASSWORD is not configured on the server'
      ),
      { status: 500 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const directory = searchParams.get('directory')
    const noFoldersParam = searchParams.get('noFolders')
    const upstreamSearchParams = new URLSearchParams()

    if (directory) upstreamSearchParams.set('directory', directory)
    if (noFoldersParam !== null) {
      upstreamSearchParams.set(
        'noFolders',
        parseBoolean(noFoldersParam) ? '1' : '0'
      )
    }

    const upstreamUrl = `${ESCALIONCLOUD_FILES_API_URL}?${upstreamSearchParams.toString()}`

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'x-api-password': password,
      },
      cache: 'no-store',
    })
    const upstreamBody = await parseUpstreamResponse(upstreamResponse)

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        buildError(
          'ESCALIONCLOUD_REQUEST_FAILED',
          `EscalionCloud files request failed with status ${upstreamResponse.status}`
        ),
        { status: upstreamResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: Array.isArray(upstreamBody)
        ? upstreamBody
        : (upstreamBody?.data ?? upstreamBody),
    })
  } catch (error) {
    console.log('EscalionCloud files API error:', error)
    return NextResponse.json(
      buildError(
        'INTERNAL_ERROR',
        'Unexpected error while fetching files from EscalionCloud'
      ),
      { status: 500 }
    )
  }
}
