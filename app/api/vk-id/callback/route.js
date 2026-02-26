import { NextResponse } from 'next/server'

export const GET = async () =>
  NextResponse.json(
    { success: true, message: 'VK ID callback endpoint is ready' },
    { status: 200 }
  )

