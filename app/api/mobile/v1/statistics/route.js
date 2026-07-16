import { NextResponse } from 'next/server'
import { GET as getStatistics } from '../../../statistics/route'
import { sanitizeMobileStatisticsPayload } from '@server/mobile/statistics'

export const GET = async (req) => {
  const response = await getStatistics(req)
  const payload = await response.json()
  return NextResponse.json(sanitizeMobileStatisticsPayload(payload), {
    status: response.status,
  })
}
