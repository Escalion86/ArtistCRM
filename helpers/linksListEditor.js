const DEFAULT_CLIPBOARD_ERROR = 'В буфере обмена нет корректной ссылки'

const isClickableLink = (value) => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return false

  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const getClipboardLinkAddResult = ({ links = [], clipboardText }) => {
  const preparedLink = String(clipboardText ?? '').trim()
  if (!isClickableLink(preparedLink)) {
    return { ok: false, error: DEFAULT_CLIPBOARD_ERROR }
  }

  return {
    ok: true,
    links: [...(Array.isArray(links) ? links : []), preparedLink],
  }
}

export { DEFAULT_CLIPBOARD_ERROR, isClickableLink, getClipboardLinkAddResult }
