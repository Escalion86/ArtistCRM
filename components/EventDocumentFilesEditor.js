import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload } from '@fortawesome/free-solid-svg-icons/faUpload'
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons/faTrashAlt'
import AppButton from '@components/AppButton'
import IconActionButton from '@components/IconActionButton'
import LabeledContainer from '@components/LabeledContainer'
import { sendFile } from '@helpers/cloudinary'

const CLOUD_UPLOADS_URL = 'https://cloud.escalion.ru/uploads'

const formatFileSize = (size) => {
  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

const normalizeUploadUrl = (item, directory) => {
  if (typeof item === 'string') {
    if (item.startsWith('http://') || item.startsWith('https://')) return item
    return `${CLOUD_UPLOADS_URL}/${directory}/${item}`.replaceAll(' ', '%20')
  }

  if (!item || typeof item !== 'object') return ''
  const url = item.url || item.secure_url || item.href
  if (typeof url === 'string' && url) return url

  const path = item.path || item.filePath
  if (typeof path === 'string' && path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    return `${CLOUD_UPLOADS_URL}/${path}`.replaceAll(' ', '%20')
  }

  const fileName = item.name || item.fileName
  if (typeof fileName === 'string' && fileName) {
    return `${CLOUD_UPLOADS_URL}/${directory}/${fileName}`.replaceAll(
      ' ',
      '%20'
    )
  }

  return ''
}

const buildDocumentFile = ({ sourceFile, uploadItem, directory }) => {
  const url = normalizeUploadUrl(uploadItem, directory)
  if (!url) return null
  const uploadedName =
    typeof uploadItem === 'object'
      ? uploadItem?.originalName || uploadItem?.name || uploadItem?.fileName
      : ''
  return {
    name:
      uploadedName || sourceFile?.name || url.split('/').pop() || 'Документ',
    description:
      uploadedName || sourceFile?.name || url.split('/').pop() || 'Документ',
    url,
    size: sourceFile?.size ?? uploadItem?.size ?? 0,
    type: sourceFile?.type ?? uploadItem?.type ?? '',
    uploadedAt: new Date().toISOString(),
  }
}

const EventDocumentFilesEditor = ({
  label,
  files = [],
  onChange,
  directory,
  noMargin = false,
}) => {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const safeFiles = Array.isArray(files) ? files : []

  const handleRemoveFile = (index) => {
    if (!window.confirm('Удалить файл из списка документов?')) return
    onChange?.(safeFiles.filter((_, idx) => idx !== index))
  }

  const handleDescriptionChange = (index, description) => {
    onChange?.(
      safeFiles.map((file, idx) =>
        idx === index ? { ...file, description } : file
      )
    )
  }

  const handleFilesSelected = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = null
    if (!selectedFiles.length || !directory) return

    setUploading(true)
    setError('')

    try {
      const uploadedFiles = []
      for (const sourceFile of selectedFiles) {
        const uploadItems = await sendFile(
          sourceFile,
          null,
          directory,
          null,
          'artistcrm',
          setError
        )
        const normalizedItems = Array.isArray(uploadItems)
          ? uploadItems
          : [uploadItems]
        normalizedItems
          .map((uploadItem) =>
            buildDocumentFile({ sourceFile, uploadItem, directory })
          )
          .filter(Boolean)
          .forEach((item) => uploadedFiles.push(item))
      }

      if (uploadedFiles.length > 0) {
        onChange?.([...safeFiles, ...uploadedFiles])
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <LabeledContainer label={label} noMargin={noMargin}>
      <div className="flex flex-col gap-2">
        {safeFiles.length > 0 ? (
          <div className="flex flex-col gap-2">
            {safeFiles.map((file, index) => (
              <div
                key={`${label}-file-${file?.url || index}`}
                className="tablet:flex-row tablet:items-center flex flex-col gap-2 rounded border border-gray-200 p-2"
              >
                <a
                  href={file?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:border-general tablet:w-56 min-w-0 rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                  title={file?.name || file?.url}
                >
                  <span className="block truncate font-medium">
                    {file?.name || 'Документ'}
                  </span>
                  {formatFileSize(file?.size) ? (
                    <span className="block text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </span>
                  ) : null}
                </a>
                <input
                  type="text"
                  value={file?.description ?? ''}
                  onChange={(event) =>
                    handleDescriptionChange(index, event.target.value)
                  }
                  placeholder="Описание/Название"
                  className="focus:border-general focus:ring-general/20 min-h-9 min-w-0 flex-1 rounded border border-gray-300 px-2 text-sm outline-none focus:ring-2"
                />
                <div className="tablet:self-auto self-end">
                  <IconActionButton
                    icon={faTrashAlt}
                    onClick={() => handleRemoveFile(index)}
                    title="Удалить файл"
                    variant="danger"
                    size="xs"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {error}
          </div>
        ) : null}
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <AppButton
            variant="secondary"
            size="sm"
            className="rounded"
            disabled={uploading || !directory}
            onClick={() => inputRef.current?.click()}
          >
            <span className="inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faUpload} className="h-3 w-3" />
              {uploading ? 'Загрузка...' : 'Загрузить файл'}
            </span>
          </AppButton>
        </div>
      </div>
    </LabeledContainer>
  )
}

export default EventDocumentFilesEditor
