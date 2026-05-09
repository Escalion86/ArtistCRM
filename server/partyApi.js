import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import getPartyTenantContext from './getPartyTenantContext'

export const PARTY_MANAGEMENT_ROLES = Object.freeze(['owner', 'admin'])

export const partyError = (status, code, message, type = 'server', extra = {}) =>
  NextResponse.json(
    {
      success: false,
      error: {
        code,
        type,
        message,
      },
      ...extra,
    },
    { status }
  )

export const isValidObjectId = (value) =>
  Boolean(value && mongoose.Types.ObjectId.isValid(String(value)))

export const getPartyRequestContext = async ({
  managementOnly = false,
} = {}) => {
  const context = await getPartyTenantContext()

  if (!context.sessionUser?._id) {
    return {
      context,
      error: partyError(401, 'unauthorized', 'Не авторизован', 'auth'),
    }
  }

  if (!context.tenantId || !context.staff) {
    return {
      context,
      error: partyError(
        403,
        'partycrm_access_not_configured',
        'Для пользователя не настроен доступ к PartyCRM',
        'permission'
      ),
    }
  }

  if (managementOnly && !PARTY_MANAGEMENT_ROLES.includes(context.role)) {
    return {
      context,
      error: partyError(
        403,
        'partycrm_forbidden',
        'Недостаточно прав для действия',
        'permission'
      ),
    }
  }

  return { context, error: null }
}

export const parseJsonBody = async (req) => {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}
