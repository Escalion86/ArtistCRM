import { after, NextResponse } from 'next/server'
import { FileImportError } from '@helpers/fileImport.mjs'
import {
  changeFileImport,
  getFileImportContext,
  readFileImport,
  runFileImport,
  serializeFileImport,
} from '@server/fileImportService'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = async (req, { params }) => {
  try {
    const context = await getFileImportContext(req)
    const { id } = await params
    if (Number(req.headers.get('content-length')) > 20000)
      throw new FileImportError('Слишком большой запрос.')
    const body = await req.json()
    await changeFileImport(id, context, body)
    const job = await readFileImport(id, context.tenantId)
    if (['analyzing', 'importing'].includes(job.status))
      after(() => runFileImport(job._id, context.tenantId))
    return NextResponse.json({
      success: true,
      data: await serializeFileImport(job),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof FileImportError
            ? error.message
            : 'Не удалось выполнить действие. Прогресс сохранён.',
        code:
          error instanceof FileImportError ? error.code : 'FILE_IMPORT_FAILED',
      },
      { status: error instanceof FileImportError ? error.status : 500 }
    )
  }
}
