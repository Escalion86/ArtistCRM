import { after, NextResponse } from 'next/server'
import FileImports from '@models/FileImports'
import { extractImportFile } from '@server/fileImportParser.mjs'
import { FileImportError, FILE_IMPORT_MAX_BYTES } from '@helpers/fileImport.mjs'
import {
  getFileImportContext,
  makeFileImportQuote,
  serializeFileImport,
  readFileImport,
  runFileImport,
} from '@server/fileImportService'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const failure = (error) =>
  NextResponse.json(
    {
      success: false,
      error:
        error instanceof FileImportError
          ? error.message
          : 'Не удалось обработать файл.',
      code:
        error instanceof FileImportError ? error.code : 'FILE_IMPORT_FAILED',
    },
    { status: error instanceof FileImportError ? error.status : 500 }
  )

export const GET = async (req) => {
  try {
    const context = await getFileImportContext(req)
    const id = new URL(req.url).searchParams.get('id')
    if (id) {
      const job = await readFileImport(id, context.tenantId)
      if (['analyzing', 'importing'].includes(job.status))
        after(() => runFileImport(job._id, context.tenantId))
      return NextResponse.json(
        { success: true, data: await serializeFileImport(job) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
    const jobs = await FileImports.find({
      tenantId: context.tenantId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('fileName status createdAt')
      .lean()
    return NextResponse.json(
      {
        success: true,
        data: jobs.map((job) => ({
          id: String(job._id),
          fileName: job.fileName,
          status: job.status,
          createdAt: job.createdAt,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return failure(error)
  }
}

export const POST = async (req) => {
  try {
    const context = await getFileImportContext(req)
    if (
      Number(req.headers.get('content-length')) >
      FILE_IMPORT_MAX_BYTES + 20000
    )
      throw new FileImportError('Максимальный размер файла — 5 МБ.')
    // Bound the body before multipart parsing, including requests without Content-Length.
    const reader = req.body?.getReader()
    if (!reader) throw new FileImportError('Выберите файл.')
    const chunks = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > FILE_IMPORT_MAX_BYTES + 20000) {
        await reader.cancel()
        throw new FileImportError('Максимальный размер файла — 5 МБ.')
      }
      chunks.push(value)
    }
    const data = await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': req.headers.get('content-type') || '' },
    }).formData()
    const file = data.get('file')
    if (
      !file ||
      typeof file.arrayBuffer !== 'function' ||
      data.getAll('file').length !== 1
    )
      throw new FileImportError('Выберите один файл.')
    const parsed = extractImportFile(
      file.name,
      Buffer.from(await file.arrayBuffer())
    )
    const existing = await FileImports.findOne({
      tenantId: context.tenantId,
      fileHash: parsed.fileHash,
    })
      .select('+lines')
      .lean()
    if (existing)
      return NextResponse.json({
        success: true,
        data: await serializeFileImport(existing),
        reused: true,
      })
    const count = await FileImports.countDocuments({
      tenantId: context.tenantId,
    })
    if (count >= 20)
      throw new FileImportError(
        'Сохранено 20 импортов. Дождитесь автоматического удаления файлов с истёкшим сроком хранения.'
      )
    const job = {
      ...parsed,
      tenantId: context.tenantId,
      userId: context.user._id,
      note: String(data.get('note') || '').slice(0, 2000),
      records: [],
    }
    const quote = await makeFileImportQuote(job, context)
    const saved = await FileImports.findOneAndUpdate(
      { tenantId: context.tenantId, fileHash: parsed.fileHash },
      { $setOnInsert: { ...job, quote } },
      { upsert: true, returnDocument: 'after' }
    )
      .select('+lines')
      .lean()
    return NextResponse.json({
      success: true,
      data: await serializeFileImport(saved),
    })
  } catch (error) {
    return failure(error)
  }
}
