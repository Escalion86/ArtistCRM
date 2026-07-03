'use client'

import { useMemo, useRef, useState } from 'react'
import ComboBox from '@components/ComboBox'
import Input from '@components/Input'
import { sendFile } from '@helpers/cloudinary'
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPES,
  getDocumentDefaultTitle,
  getDocumentTypeLabel,
} from '@helpers/documentTypes'
import { normalizeEventDocuments } from '@helpers/eventDocuments'

const CLOUD_UPLOADS_URL = 'https://cloud.escalion.ru/uploads'

const createId = () =>
  typeof crypto !== 'undefined' && crypto?.randomUUID
    ? crypto.randomUUID()
    : `document-${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeUploadUrl = (item, directory) => {
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

const formatFileSize = (size) => {
  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

const EventDocumentsEditor = ({
  documents = [],
  onChange,
  directory,
  noMargin = false,
}) => {
  const fileInputRef = useRef(null)
  const [linkType, setLinkType] = useState(DOCUMENT_TYPES.CONTRACT)
  const [linkCustomTypeName, setLinkCustomTypeName] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [fileType, setFileType] = useState(DOCUMENT_TYPES.OTHER)
  const [fileCustomTypeName, setFileCustomTypeName] = useState('')
  const [fileTitle, setFileTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const safeDocuments = useMemo(
    () => normalizeEventDocuments(documents),
    [documents]
  )

  const emitChange = (nextDocuments) => {
    onChange?.(normalizeEventDocuments(nextDocuments))
  }

  const buildTitle = (title, type, customTypeName) =>
    String(title ?? '').trim() || getDocumentDefaultTitle(type, customTypeName)

  const handleAddLink = () => {
    const url = String(linkUrl ?? '').trim()
    if (!url) {
      setError('Добавьте ссылку на документ')
      return
    }
    const customTypeName =
      linkType === DOCUMENT_TYPES.OTHER ? linkCustomTypeName.trim() : ''
    emitChange([
      ...safeDocuments,
      {
        id: createId(),
        type: linkType,
        customTypeName,
        title: buildTitle(linkTitle, linkType, customTypeName),
        url,
        file: null,
        createdAt: new Date().toISOString(),
      },
    ])
    setError('')
    setLinkTitle('')
    setLinkUrl('')
  }

  const handleFilesSelected = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selectedFiles.length || !directory) return
    setUploading(true)
    setError('')
    try {
      const customTypeName =
        fileType === DOCUMENT_TYPES.OTHER ? fileCustomTypeName.trim() : ''
      const uploadedDocuments = []
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
        normalizedItems.forEach((uploadItem) => {
          const url = normalizeUploadUrl(uploadItem, directory)
          if (!url) return
          const name =
            uploadItem?.originalName ||
            uploadItem?.name ||
            uploadItem?.fileName ||
            sourceFile.name ||
            url.split('/').pop() ||
            'Документ'
          uploadedDocuments.push({
            id: createId(),
            type: fileType,
            customTypeName,
            title: buildTitle(fileTitle || name, fileType, customTypeName),
            url: '',
            file: {
              name,
              url,
              path: uploadItem?.path || uploadItem?.filePath || '',
              size: sourceFile.size ?? uploadItem?.size ?? 0,
              contentType: sourceFile.type ?? uploadItem?.type ?? '',
            },
            createdAt: new Date().toISOString(),
          })
        })
      }
      if (uploadedDocuments.length > 0) {
        emitChange([...safeDocuments, ...uploadedDocuments])
        setFileTitle('')
      }
    } finally {
      setUploading(false)
    }
  }

  const updateDocument = (id, patch) => {
    emitChange(
      safeDocuments.map((document) =>
        document.id === id ? { ...document, ...patch } : document
      )
    )
  }

  const removeDocument = (id) => {
    if (!window.confirm('Удалить документ из мероприятия?')) return
    emitChange(safeDocuments.filter((document) => document.id !== id))
  }

  return (
    <div className={`flex flex-col gap-3 ${noMargin ? '' : 'mt-2'}`}>
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded border border-gray-200 p-3">
        <div className="text-sm font-semibold text-gray-800">
          Добавить ссылку
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 tablet:grid-cols-[160px_1fr]">
          <ComboBox
            label="Тип"
            items={DOCUMENT_TYPE_OPTIONS}
            value={linkType}
            onChange={(value) => setLinkType(value || DOCUMENT_TYPES.OTHER)}
            noMargin
            fullWidth
          />
          <Input
            label="Название"
            value={linkTitle}
            onChange={setLinkTitle}
            noMargin
            fullWidth
          />
          {linkType === DOCUMENT_TYPES.OTHER ? (
            <Input
              label="Название типа"
              value={linkCustomTypeName}
              onChange={setLinkCustomTypeName}
              noMargin
              fullWidth
            />
          ) : null}
          <Input
            label="Ссылка"
            value={linkUrl}
            onChange={setLinkUrl}
            noMargin
            fullWidth
          />
        </div>
        <button
          type="button"
          className="action-icon-button action-icon-button--warning mt-2 flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
          onClick={handleAddLink}
        >
          Добавить ссылку
        </button>
      </div>

      <div className="rounded border border-gray-200 p-3">
        <div className="text-sm font-semibold text-gray-800">
          Прикрепить файл
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 tablet:grid-cols-[160px_1fr]">
          <ComboBox
            label="Тип"
            items={DOCUMENT_TYPE_OPTIONS}
            value={fileType}
            onChange={(value) => setFileType(value || DOCUMENT_TYPES.OTHER)}
            noMargin
            fullWidth
          />
          <Input
            label="Название"
            value={fileTitle}
            onChange={setFileTitle}
            noMargin
            fullWidth
          />
          {fileType === DOCUMENT_TYPES.OTHER ? (
            <Input
              label="Название типа"
              value={fileCustomTypeName}
              onChange={setFileCustomTypeName}
              noMargin
              fullWidth
            />
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <button
          type="button"
          className="action-icon-button action-icon-button--warning mt-2 flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
          disabled={uploading || !directory}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Загрузка...' : 'Выбрать файл'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {safeDocuments.length === 0 ? (
          <div className="rounded border border-gray-200 p-3 text-sm text-gray-500">
            Документы пока не добавлены.
          </div>
        ) : (
          safeDocuments.map((document) => (
            <div
              key={document.id}
              className="rounded border border-gray-200 p-3"
            >
              <div className="grid grid-cols-1 gap-2 tablet:grid-cols-[160px_1fr]">
                <ComboBox
                  label="Тип"
                  items={DOCUMENT_TYPE_OPTIONS}
                  value={document.type}
                  onChange={(value) => {
                    const nextType = value || DOCUMENT_TYPES.OTHER
                    updateDocument(document.id, {
                      type: nextType,
                      customTypeName: '',
                      title: getDocumentDefaultTitle(nextType),
                    })
                  }}
                  noMargin
                  fullWidth
                />
                <Input
                  label="Название"
                  value={document.title}
                  onChange={(value) =>
                    updateDocument(document.id, { title: value })
                  }
                  noMargin
                  fullWidth
                />
                {document.type === DOCUMENT_TYPES.OTHER ? (
                  <Input
                    label="Название типа"
                    value={document.customTypeName}
                    onChange={(value) =>
                      updateDocument(document.id, { customTypeName: value })
                    }
                    noMargin
                    fullWidth
                  />
                ) : null}
              </div>
              <a
                href={document.url || document.file?.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-xs text-gray-500 hover:text-gray-900"
              >
                {getDocumentTypeLabel(
                  document.type,
                  document.customTypeName
                )}{' '}
                · {document.url || document.file?.name || 'Документ'}
                {formatFileSize(document.file?.size)
                  ? ` · ${formatFileSize(document.file.size)}`
                  : ''}
              </a>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="action-icon-button action-icon-button--warning flex h-8 cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold"
                  onClick={() => removeDocument(document.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default EventDocumentsEditor
