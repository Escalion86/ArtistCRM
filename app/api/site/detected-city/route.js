import { NextResponse } from 'next/server'
import getTenantContext from '@server/getTenantContext'
import { detectCity } from '@server/cityGeolocation.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const responseOptions = {
  headers: { 'Cache-Control': 'private, no-store, max-age=0' },
}

export const GET = async (req) => {
  try {
    const { tenantId } = await getTenantContext()
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { ...responseOptions, status: 401 }
      )
    }

    const town = await detectCity(req.headers)
    return NextResponse.json({ success: true, data: { town } }, responseOptions)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Не удалось определить город' },
      { ...responseOptions, status: 503 }
    )
  }
}
