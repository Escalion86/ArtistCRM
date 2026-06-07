import { NextResponse } from 'next/server'

export const POST = async () =>
  NextResponse.json(
    {
      success: false,
      error:
        'Legacy password reset endpoint is disabled. Use /api/phone/verify/finalize.',
    },
    { status: 410 }
  )
