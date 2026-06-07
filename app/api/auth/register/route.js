import { NextResponse } from 'next/server'

export const POST = async () =>
  NextResponse.json(
    {
      success: false,
      error:
        'Legacy registration endpoint is disabled. Use /api/phone/verify/finalize.',
    },
    { status: 410 }
  )
