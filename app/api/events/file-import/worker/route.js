import { timingSafeEqual } from 'node:crypto'
import { after, NextResponse } from 'next/server'
import FileImports from '@models/FileImports'
import dbConnect from '@server/dbConnect'
import { cleanupFileImports, runFileImport } from '@server/fileImportService'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = async (req) => {
  const secret = String(process.env.CRON_SECRET || '')
  const supplied = (req.headers.get('authorization') || '').replace(
    /^Bearer /,
    ''
  )
  if (
    !secret ||
    Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
  )
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 401 }
    )
  await dbConnect()
  const jobs = await FileImports.find({
    status: { $in: ['analyzing', 'importing'] },
    $or: [{ leaseUntil: null }, { leaseUntil: { $lt: new Date() } }],
  })
    .sort({ updatedAt: 1 })
    .limit(2)
    .select('_id tenantId')
    .lean()
  after(async () => {
    await Promise.allSettled(
      jobs.map((job) => runFileImport(job._id, String(job.tenantId)))
    )
    await cleanupFileImports()
  })
  return NextResponse.json({ success: true, data: { scheduled: jobs.length } })
}
