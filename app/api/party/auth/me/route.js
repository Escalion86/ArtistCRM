import { NextResponse } from 'next/server'
import { getPartySessionUser } from '@server/partyAuth'

export async function GET() {
  const user = await getPartySessionUser()

  if (!user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        _id: String(user._id),
        phone: user.phone || '',
        email: user.email || '',
        firstName: user.firstName || '',
        secondName: user.secondName || '',
      },
    },
  })
}
