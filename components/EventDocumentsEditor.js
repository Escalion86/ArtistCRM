'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
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
import { modalsFuncAtom } from '@state/atoms'

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
  const [error, setError] = useState('')
  const modalsFunc = useAtomValue(modalsFuncAtom)

  const safeDocuments = useMemo(
    () => normalizeEventDocuments(documents),
    [documents]
  )

  const emitChange = useCallback(
    (nextDocuments) => {
      onChange?.(normalizeEventDocuments(nextDocuments))
    },
    [onChange]
  )

  const buildTitle = (title, type, customTypeName) =>
    String(title ?? '').trim() || getDocumentDefaultTitle(type, customTypeName)

  const removeDocument = (id) => {
    if (!window.confirm('Удалить документ из мероприятия?')) return
    emitChange(safeDocuments.filter((document) => document.id !== id))
  }

  const openAddDocumentModal = () => {
    const AddEventDocumentModal = ({
      closeModal,
      setOnConfirmFunc,
      setConfirmButtonName,
      setDisableConfirm,
    }) => {
      const [mode, setMode] = useState('link')
      const [type, setType] = useState(DOCUMENT_TYPES.CONTRACT)
      const [customTypeName, setCustomTypeName] = useState('')
      const [title, setTitle] = useState('')
      const [url, setUrl] = useState('')
      const [file, setFile] = useState(null)
      const [localError, setLocalError] = useState('')
      const [saving, setSaving] = useState(false)
      const confirmRef = useRef(null)

      const handleConfirm = useCallback(async () => {
        const normalizedCustomTypeName =
          type === DOCUMENT_TYPES.OTHER ? customTypeName.trim() : ''
        const now = new Date().toISOString()

        if (mode === 'link') {
          const normalizedUrl = String(url ?? '').trim()
          if (!normalizedUrl) {
            setLocalError('Добавьте ссылку на документ')
            return
          }
          emitChange([
            ...safeDocuments,
            {
              id: createId(),
              type,
              customTypeName: normalizedCustomTypeName,
              title: buildTitle(title, type, normalizedCustomTypeName),
              url: normalizedUrl,
              file: null,
              createdAt: now,
            },
          ])
          setError('')
          closeModal()
          return
        }

        if (!directory) {
          setLocalError('Сначала сохраните мероприятие, затем прикрепите файл')
          return
        }
        if (!file) {
          setLocalError('Выберите файл документа')
          return
        }

        setSaving(true)
        setLocalError('')
        try {
          const uploadItems = await sendFile(
            file,
            null,
            directory,
            null,
            'artistcrm',
            setLocalError
          )
          const normalizedItems = Array.isArray(uploadItems)
            ? uploadItems
            : [uploadItems]
          const uploadedDocuments = normalizedItems
            .map((uploadItem) => {
              const fileUrl = normalizeUploadUrl(uploadItem, directory)
              if (!fileUrl) return null
              const name =
                uploadItem?.originalName ||
                uploadItem?.name ||
                uploadItem?.fileName ||
                file.name ||
                fileUrl.split('/').pop() ||
                'Документ'
              return {
                id: createId(),
                type,
                customTypeName: normalizedCustomTypeName,
                title: buildTitle(title || name, type, normalizedCustomTypeName),
                url: '',
                file: {
                  name,
                  url: fileUrl,
                  path: uploadItem?.path || uploadItem?.filePath || '',
                  size: file.size ?? uploadItem?.size ?? 0,
                  contentType: file.type ?? uploadItem?.type ?? '',
                },
                createdAt: now,
              }
            })
            .filter(Boolean)

          if (!uploadedDocuments.length) {
            setLocalError('Не удалось получить ссылку на загруженный файл')
            return
          }

          emitChange([...safeDocuments, ...uploadedDocuments])
          setError('')
          closeModal()
        } finally {
          setSaving(false)
        }
      }, [
        closeModal,
        customTypeName,
        file,
        mode,
        title,
        type,
        url,
      ])

      useEffect(() => {
        confirmRef.current = handleConfirm
      }, [handleConfirm])

      useEffect(() => {
        setConfirmButtonName(saving ? 'Загрузка...' : 'Добавить')
      }, [saving, setConfirmButtonName])

      useEffect(() => {
        setDisableConfirm(saving)
      }, [saving, setDisableConfirm])

      useEffect(() => {
        setOnConfirmFunc(() => confirmRef.current?.())
      }, [setOnConfirmFunc])

      return (
        <div className="flex flex-col gap-3">
          {localError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {localError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`flex h-10 cursor-pointer items-center justify-center rounded border px-3 text-sm font-semibold ${
                mode === 'link'
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              onClick={() => {
                setMode('link')
                setLocalError('')
              }}
            >
              Ссылка
            </button>
            <button
              type="button"
              className={`flex h-10 cursor-pointer items-center justify-center rounded border px-3 text-sm font-semibold ${
                mode === 'file'
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              onClick={() => {
                setMode('file')
                setLocalError('')
              }}
            >
              Файл
            </button>
          </div>

          <ComboBox
            label="Тип"
            items={DOCUMENT_TYPE_OPTIONS}
            value={type}
            onChange={(value) => setType(value || DOCUMENT_TYPES.OTHER)}
            noMargin
            fullWidth
          />
          {type === DOCUMENT_TYPES.OTHER ? (
            <Input
              label="Название типа"
              value={customTypeName}
              onChange={setCustomTypeName}
              noMargin
              fullWidth
            />
          ) : null}
          <Input
            label="Название"
            value={title}
            onChange={setTitle}
            noMargin
            fullWidth
          />
          {mode === 'link' ? (
            <Input
              label="Ссылка"
              value={url}
              onChange={setUrl}
              noMargin
              fullWidth
            />
          ) : (
            <div className="flex flex-col gap-2 rounded border border-gray-200 p-3">
              <div className="text-sm font-semibold text-gray-800">
                {file?.name || 'Файл не выбран'}
              </div>
              <input
                type="file"
                onChange={(event) => {
                  setLocalError('')
                  setFile(event.target.files?.[0] ?? null)
                }}
              />
              {!directory ? (
                <div className="text-xs text-amber-700">
                  Для прикрепления файла нужно сначала сохранить мероприятие.
                </div>
              ) : null}
            </div>
          )}
        </div>
      )
    }

    modalsFunc.add({
      title: 'Добавить документ',
      confirmButtonName: 'Добавить',
      declineButtonName: 'Закрыть',
      closeButtonName: 'Закрыть',
      Children: AddEventDocumentModal,
    })
  }

  return (
    <div className={`flex flex-col gap-3 ${noMargin ? '' : 'mt-2'}`}>
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-800">
          Добавленные документы
        </div>
        <button
          type="button"
          className="action-icon-button action-icon-button--warning flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
          onClick={openAddDocumentModal}
        >
          Добавить документ
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
              className="flex flex-col gap-2 rounded border border-gray-200 p-3 tablet:flex-row tablet:items-center tablet:justify-between"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-800">
                  {document.title || getDocumentDefaultTitle(document.type)}
                </div>
                <a
                  href={document.url || document.file?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-gray-500 hover:text-gray-900"
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
              </div>
              <button
                type="button"
                className="action-icon-button action-icon-button--warning flex h-8 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
                onClick={() => removeDocument(document.id)}
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default EventDocumentsEditor
