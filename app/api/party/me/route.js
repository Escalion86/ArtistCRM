import { NextResponse } from 'next/server'
import getPartyTenantContext from '@server/getPartyTenantContext'

export async function GET() {
  try {
    const { sessionUser, staff, company, tenantId, role } =
      await getPartyTenantContext()

    if (!sessionUser?._id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            type: 'auth',
            message: 'Не авторизован',
          },
        },
        { status: 401 }
      )
    }

    if (!tenantId || !staff) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'partycrm_access_not_configured',
            type: 'permission',
            message: 'Для пользователя не настроен доступ к PartyCRM',
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        role,
        staff,
        company,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'partycrm_context_failed',
          type: 'server',
          message: error.message,
        },
      },
      { status: 500 }
    )
  }
}
