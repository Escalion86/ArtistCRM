import {
  SERVICE_WORKER_SCRIPT,
  SERVICE_WORKER_VERSION,
} from '@server/serviceWorkerScript'

export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(SERVICE_WORKER_SCRIPT, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'X-ArtistCRM-Service-Worker': SERVICE_WORKER_VERSION,
    },
  })
}
