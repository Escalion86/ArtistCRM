import {
  hasMeaningfulNewsContent,
  sanitizeNewsRichText,
} from './newsRichText.mjs'

export const NEWS_LIMITS = Object.freeze({
  TITLE_MAX: 120,
  VERSION_MAX: 20,
  ITEMS_MAX: 20,
  ITEM_MAX: 300,
})

export const parseItemsText = (text) =>
  String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

export const normalizeNewsPayload = (body) => {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) return { error: 'Укажите заголовок новости', value: null }
  if (title.length > NEWS_LIMITS.TITLE_MAX) {
    return {
      error: `Заголовок длиннее ${NEWS_LIMITS.TITLE_MAX} символов`,
      value: null,
    }
  }

  const version = typeof body?.version === 'string' ? body.version.trim() : ''
  if (version.length > NEWS_LIMITS.VERSION_MAX) {
    return {
      error: `Версия длиннее ${NEWS_LIMITS.VERSION_MAX} символов`,
      value: null,
    }
  }

  const items = Array.isArray(body?.items)
    ? body.items.map((item) => String(item ?? '').trim()).filter(Boolean)
    : parseItemsText(body?.itemsText)
  if (items.length > NEWS_LIMITS.ITEMS_MAX) {
    return { error: `Не больше ${NEWS_LIMITS.ITEMS_MAX} пунктов`, value: null }
  }
  if (items.some((item) => item.length > NEWS_LIMITS.ITEM_MAX)) {
    return {
      error: `Пункт длиннее ${NEWS_LIMITS.ITEM_MAX} символов`,
      value: null,
    }
  }

  const contentHtml = sanitizeNewsRichText(body?.contentHtml)
  if (items.length === 0 && !hasMeaningfulNewsContent(contentHtml)) {
    return { error: 'Добавьте текст или изображение новости', value: null }
  }

  return {
    error: null,
    value: {
      title,
      version,
      items,
      contentHtml,
      isPublished: body?.isPublished === true,
    },
  }
}

export const filterUnreadNews = (news, lastSeenNewsAt) => {
  const list = Array.isArray(news) ? news : []
  const seenTime = lastSeenNewsAt ? new Date(lastSeenNewsAt).getTime() : 0
  const safeSeenTime = Number.isFinite(seenTime) ? seenTime : 0

  return list.filter((item) => {
    const publishedTime = new Date(
      item?.publishedAt ?? item?.createdAt ?? null
    ).getTime()
    return Number.isFinite(publishedTime) && publishedTime > safeSeenTime
  })
}

const getNewsPublishedTime = (item) => {
  const time = new Date(item?.publishedAt ?? item?.createdAt ?? null).getTime()
  return Number.isFinite(time) ? time : 0
}

export const getLatestUnreadNews = (news, lastSeenNewsAt) =>
  filterUnreadNews(news, lastSeenNewsAt).reduce(
    (latest, item) =>
      !latest || getNewsPublishedTime(item) > getNewsPublishedTime(latest)
        ? item
        : latest,
    null
  )

const pluralRu = (count, one, few, many) => {
  const mod100 = Math.abs(count) % 100
  const mod10 = mod100 % 10
  if (mod100 > 10 && mod100 < 20) return many
  if (mod10 > 1 && mod10 < 5) return few
  if (mod10 === 1) return one
  return many
}

export const buildNewsToastLabel = (unreadCount, latestVersion) => {
  const count = Number.isFinite(unreadCount) ? unreadCount : 0
  const word = pluralRu(count, 'нововведение', 'нововведения', 'нововведений')
  const version = typeof latestVersion === 'string' ? latestVersion.trim() : ''
  return version ? `${count} ${word} · ${version}` : `${count} ${word}`
}
