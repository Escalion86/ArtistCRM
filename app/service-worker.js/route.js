import { GET as handleGet } from '../sw.js/route'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleGet()
}
