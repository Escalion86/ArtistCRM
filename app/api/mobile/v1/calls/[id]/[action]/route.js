import { NextResponse } from 'next/server'
import { POST as analyzeCall } from '../../../../../calls/[id]/analyze/route'
import { POST as processRecording } from '../../../../../calls/[id]/process-recording/route'
import { POST as ignoreCall } from '../../../../../calls/[id]/ignore/route'
import { POST as linkCall } from '../../../../../calls/[id]/link/route'
import { POST as decideCall } from '../../../../../calls/[id]/decision/route'
import { GET as getEventDraft } from '../../../../../calls/[id]/event-draft/route'
import { mobileError } from '@server/mobile/routeHelpers'
import { sanitizeMobileCallPayload } from '@server/mobile/calls'
import { handleMobileCallResult } from '@server/mobile/callResult'

const sanitizeResponse = async (response) => {
  const payload = await response.json()
  return NextResponse.json(sanitizeMobileCallPayload(payload), {
    status: response.status,
  })
}

const callContext = async (params) => {
  const routeParams = await params
  return {
    action: routeParams.action,
    context: { params: Promise.resolve({ id: routeParams.id }) },
  }
}

export const GET = async (req, { params }) => {
  const { action, context } = await callContext(params)
  if (action === 'event-draft') {
    return getEventDraft(req, context)
  }
  return mobileError('CALL_ACTION_INVALID', 'Неизвестное действие со звонком', 400)
}

export const POST = async (req, { params }) => {
  const { action, context } = await callContext(params)
  if (action === 'result') return handleMobileCallResult(req, context)
  const handlers = {
    analyze: analyzeCall,
    'process-recording': processRecording,
    ignore: ignoreCall,
    link: linkCall,
    decision: decideCall,
  }
  const handler = handlers[action]
  if (!handler) {
    return mobileError('CALL_ACTION_INVALID', 'Неизвестное действие со звонком', 400)
  }
  return sanitizeResponse(await handler(req, context))
}
