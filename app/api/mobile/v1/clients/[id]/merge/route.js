import { NextResponse } from 'next/server'
import {
  GET as getClientMerge,
  POST as postClientMerge,
} from '../../../../../clients/[id]/merge/route'
import { sanitizeMobileClientMergePayload } from '@server/mobile/clients'

const sanitizeResponse = async (response) => {
  const payload = await response.json().catch(() => ({}))
  return NextResponse.json(sanitizeMobileClientMergePayload(payload), {
    status: response.status,
  })
}

export const GET = async (req, context) =>
  sanitizeResponse(await getClientMerge(req, context))

export const POST = async (req, context) =>
  sanitizeResponse(await postClientMerge(req, context))
