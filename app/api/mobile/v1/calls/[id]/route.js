import { NextResponse } from 'next/server'
import { GET as getCall, PUT as putCall } from '../../../../calls/[id]/route'
import { sanitizeMobileCallPayload } from '@server/mobile/calls'

const sanitizeResponse = async (response) => {
  const payload = await response.json()
  return NextResponse.json(sanitizeMobileCallPayload(payload), {
    status: response.status,
  })
}

export const GET = async (req, context) =>
  sanitizeResponse(await getCall(req, context))

export const PUT = async (req, context) =>
  sanitizeResponse(await putCall(req, context))
