import { NextResponse } from 'next/server'
import getRequestContext from '@server/getRequestContext'
import { uploadFilesToEscalionCloud } from '@server/escalionCloud'

export const runtime = 'nodejs'

const buildError = (type, message) => ({
  success: false,
  data: {
    error: {
      type,
      message,
    },
  },
})

const normalizePathSegment = (value) =>
  typeof value === 'string' ? value.trim().replace(/^\/+|\/+$/g, '') : ''

export async function POST(request) {
  const { user, tenantId } = await getRequestContext(request)
  if (!user?._id) {
    return NextResponse.json(buildError('UNAUTHORIZED', 'Unauthorized'), {
      status: 401,
    })
  }

  if (!process.env.ESCALIONCLOUD_PASSWORD) {
    return NextResponse.json(
      buildError(
        'CONFIG_ERROR',
        'ESCALIONCLOUD_PASSWORD is not configured on the server'
      ),
      { status: 500 }
    )
  }

  try {
    const incomingFormData = await request.formData()
    const files = incomingFormData.getAll('files')
    const directoryRaw = incomingFormData.get('directory')
    const legacyProjectRaw = incomingFormData.get('project')
    const legacyFolderRaw = incomingFormData.get('folder')

    const directoryFromNewContract = normalizePathSegment(directoryRaw)
    const legacyProject = normalizePathSegment(legacyProjectRaw)
    const legacyFolder = normalizePathSegment(legacyFolderRaw)
    let directory =
      directoryFromNewContract ||
      [legacyProject, legacyFolder].filter(Boolean).join('/')

    if (
      tenantId &&
      /^artistcrm\/(?:proposal-templates|proposals)(?:\/|$)/.test(directory)
    ) {
      directory = directory.replace(
        /^artistcrm\//,
        `artistcrm/${tenantId}/`
      )
    }

    if (!files.length) {
      return NextResponse.json(
        buildError('VALIDATION_ERROR', 'No files provided for upload'),
        { status: 400 }
      )
    }

    if (!directory) {
      return NextResponse.json(
        buildError(
          'VALIDATION_ERROR',
          'Directory is required. Expected "<project>/<folder>"'
        ),
        { status: 400 }
      )
    }

    const upstreamBody = await uploadFilesToEscalionCloud({ files, directory })

    return NextResponse.json({
      success: true,
      data: upstreamBody,
    })
  } catch (error) {
    console.log('EscalionCloud upload API error:', error)
    return NextResponse.json(
      buildError(
        'INTERNAL_ERROR',
        'Unexpected error while uploading to EscalionCloud'
      ),
      { status: 500 }
    )
  }
}
