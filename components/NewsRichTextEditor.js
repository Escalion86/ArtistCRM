'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Notice from '@components/Notice'
import { sendImage } from '@helpers/cloudinary'
import {
  hasMeaningfulNewsContent,
  resolveNewsUploadUrl,
  sanitizeNewsRichText,
} from '@helpers/newsRichText.mjs'

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const NewsImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      title: { default: null },
      loading: { default: 'lazy' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { loading: 'lazy' })]
  },

})

const containsImageSource = (node, source) =>
  node?.attrs?.src === source ||
  (Array.isArray(node?.content) &&
    node.content.some((child) => containsImageSource(child, source)))

const toolbarButtonClass = (active = false) =>
  `h-8 min-w-8 cursor-pointer rounded border px-2 text-xs font-semibold transition ${
    active
      ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)] text-[var(--ui-primary-text)]'
      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
  } disabled:cursor-not-allowed disabled:opacity-50`

const NewsRichTextEditor = ({
  value = '',
  onChange,
  directory = 'news/draft',
  placeholder = '',
}) => {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        codeBlock: false,
        code: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      NewsImage,
    ],
    []
  )

  const editor = useEditor({
    extensions,
    content: sanitizeNewsRichText(value) || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'news-rich-text-content min-h-48 px-3 py-3 text-sm text-gray-800 focus:outline-none',
        'aria-label': placeholder || 'Текст новости',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (typeof onChange === 'function') {
        onChange(sanitizeNewsRichText(currentEditor.getHTML()))
      }
    },
  })

  useEffect(() => {
    if (!editor) return
    const normalized = sanitizeNewsRichText(value) || '<p></p>'
    if (sanitizeNewsRichText(editor.getHTML()) === normalized) return
    editor.commands.setContent(normalized, { emitUpdate: false })
  }, [editor, value])

  const setLink = useCallback(() => {
    if (!editor) return
    const currentHref = editor.getAttributes('link').href || ''
    const href = window.prompt('Адрес ссылки', currentHref)
    if (href === null) return
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: href.trim() })
      .run()
  }, [editor])

  const uploadImage = useCallback(
    async (file) => {
      if (!file || !editor || isUploading) return
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setUploadError('Разрешены изображения JPG, PNG, WebP и GIF')
        return
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError('Изображение должно быть не больше 10 МБ')
        return
      }

      setUploadError('')
      setIsUploading(true)
      try {
        const uploadResult = await sendImage(
          file,
          null,
          directory,
          null,
          'artistcrm',
          (message) =>
            setUploadError(message || 'Не удалось загрузить изображение')
        )
        const url = resolveNewsUploadUrl(uploadResult, { directory })
        if (!url) {
          setUploadError('Сервер не вернул ссылку на изображение')
          return
        }
        const inserted = editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'image',
              attrs: {
                src: url,
                alt: file.name || 'Изображение новости',
                loading: 'lazy',
              },
            },
            { type: 'paragraph' },
          ])
          .run()
        if (!inserted || !containsImageSource(editor.getJSON(), url)) {
          setUploadError('Изображение загрузилось, но не вставилось в текст')
        }
      } finally {
        setIsUploading(false)
      }
    },
    [directory, editor, isUploading]
  )

  if (!editor) {
    return (
      <div className="min-h-48 animate-pulse rounded-lg border border-gray-300 bg-gray-100" />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="news-rich-text-editor overflow-hidden rounded-lg border border-gray-300 bg-white">
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('bold'))}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Полужирный"
          >
            Ж
          </button>
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('italic'))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Курсив"
          >
            К
          </button>
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('strike'))}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Зачёркнутый"
          >
            S
          </button>
          <button
            type="button"
            className={toolbarButtonClass(
              editor.isActive('heading', { level: 2 })
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>
          <button
            type="button"
            className={toolbarButtonClass(
              editor.isActive('heading', { level: 3 })
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </button>
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('bulletList'))}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Маркированный список"
          >
            • Список
          </button>
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('orderedList'))}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Нумерованный список"
          >
            1. Список
          </button>
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('blockquote'))}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            Цитата
          </button>
          <button
            type="button"
            className={toolbarButtonClass(editor.isActive('link'))}
            onClick={setLink}
          >
            Ссылка
          </button>
          <button
            type="button"
            className={toolbarButtonClass()}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Загрузка…' : 'Картинка'}
          </button>
          <button
            type="button"
            className={toolbarButtonClass()}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            title="Отменить"
          >
            ↶
          </button>
          <button
            type="button"
            className={toolbarButtonClass()}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            title="Повторить"
          >
            ↷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              void uploadImage(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
          />
        </div>
        <div className="relative max-h-[48vh] overflow-y-auto">
          <EditorContent editor={editor} />
          {!hasMeaningfulNewsContent(editor.getHTML()) && placeholder ? (
            <div className="pointer-events-none absolute top-3 left-3 text-sm text-gray-400">
              {placeholder}
            </div>
          ) : null}
        </div>
      </div>
      {uploadError ? <Notice tone="error">{uploadError}</Notice> : null}
    </div>
  )
}

export default NewsRichTextEditor
