import { NextResponse } from 'next/server'
import { PATCH as patchAvitoConversation } from '../../../../../integrations/avito/conversations/[id]/route'
import { PATCH as patchVkConversation } from '../../../../../integrations/vk/conversations/[id]/route'
import { mobileError } from '@server/mobile/routeHelpers'
import { sanitizeMobileConversationPayload } from '@server/mobile/conversations'

const sanitizeResponse = async (response) => {
  const payload = await response.json()
  return NextResponse.json(sanitizeMobileConversationPayload(payload), {
    status: response.status,
  })
}

export const PATCH = async (req, { params }) => {
  const routeParams = await params
  const context = { params: Promise.resolve({ id: routeParams.id }) }
  if (routeParams.provider === 'avito') {
    return sanitizeResponse(await patchAvitoConversation(req, context))
  }
  if (routeParams.provider === 'vk') {
    return sanitizeResponse(await patchVkConversation(req, context))
  }
  return mobileError('PROVIDER_INVALID', 'Неизвестный канал переписки', 400)
}
