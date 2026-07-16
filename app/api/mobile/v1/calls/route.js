import { NextResponse } from 'next/server'
import { GET as getCalls, POST as postCall } from '../../../calls/route'
import { sanitizeMobileCallPayload } from '@server/mobile/calls'

const sanitizeResponse = async (response) => {
  const payload = await response.json()
  return NextResponse.json(sanitizeMobileCallPayload(payload), {
    status: response.status,
  })
}

export const GET = async (req) => sanitizeResponse(await getCalls(req))
export const POST = async (req) => sanitizeResponse(await postCall(req))
