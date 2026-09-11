import test from 'node:test'
import assert from 'node:assert/strict'

import {
  NEWS_LIMITS,
  buildNewsToastLabel,
  filterUnreadNews,
  getLatestUnreadNews,
  normalizeNewsPayload,
  parseItemsText,
} from './whatsNew.mjs'
import { resolveNewsUploadUrl } from './newsRichText.mjs'

test('parseItemsText разбивает по строкам, тримит и выкидывает пустые', () => {
  assert.deepEqual(parseItemsText('  Первый \n\nВторой\n   \nТретий  '), [
    'Первый',
    'Второй',
    'Третий',
  ])
  assert.deepEqual(parseItemsText(''), [])
  assert.deepEqual(parseItemsText(null), [])
})

test('normalizeNewsPayload: пустой заголовок — ошибка', () => {
  const { error } = normalizeNewsPayload({ title: '   ', items: ['a'] })
  assert.equal(error, 'Укажите заголовок новости')
})

test('normalizeNewsPayload: слишком длинный заголовок — ошибка', () => {
  const { error } = normalizeNewsPayload({
    title: 'x'.repeat(NEWS_LIMITS.TITLE_MAX + 1),
    items: ['a'],
  })
  assert.equal(error, `Заголовок длиннее ${NEWS_LIMITS.TITLE_MAX} символов`)
})

test('normalizeNewsPayload: без пунктов — ошибка', () => {
  const { error } = normalizeNewsPayload({ title: 'Тест', items: [] })
  assert.equal(error, 'Добавьте текст или изображение новости')
})

test('normalizeNewsPayload: принимает itemsText из textarea', () => {
  const { error, value } = normalizeNewsPayload({
    title: ' Тест ',
    version: ' 1.18.0 ',
    itemsText: 'Пункт 1\n\nПункт 2',
    isPublished: true,
  })
  assert.equal(error, null)
  assert.deepEqual(value, {
    title: 'Тест',
    version: '1.18.0',
    items: ['Пункт 1', 'Пункт 2'],
    contentHtml: '',
    isPublished: true,
  })
})

test('normalizeNewsPayload: isPublished строго boolean-true', () => {
  const { value } = normalizeNewsPayload({
    title: 'Тест',
    items: ['a'],
    isPublished: 'yes',
  })
  assert.equal(value.isPublished, false)
})

test('normalizeNewsPayload: принимает и очищает rich text с изображением', () => {
  const { error, value } = normalizeNewsPayload({
    title: 'Тест',
    contentHtml:
      '<h2>Заголовок</h2><script>alert(1)</script><img src="https://cloud.escalion.ru/uploads/news/image.webp" onerror="alert(2)">',
  })

  assert.equal(error, null)
  assert.match(value.contentHtml, /<h2>Заголовок<\/h2>/)
  assert.match(value.contentHtml, /<img src="https:\/\/cloud\.escalion\.ru/)
  assert.doesNotMatch(value.contentHtml, /script|onerror/)
  assert.deepEqual(value.items, [])
})

test('normalizeNewsPayload: не сохраняет встроенные data/blob изображения', () => {
  const { error, value } = normalizeNewsPayload({
    title: 'Тест',
    contentHtml:
      '<p>Текст</p><img src="data:image/png;base64,AAAA"><img src="blob:https://artistcrm.ru/example">',
  })

  assert.equal(error, null)
  assert.doesNotMatch(value.contentHtml, /data:|blob:/)
})

test('normalizeNewsPayload: пустая HTML-разметка не считается контентом', () => {
  const { error } = normalizeNewsPayload({
    title: 'Тест',
    contentHtml: '<p><br></p>',
  })
  assert.equal(error, 'Добавьте текст или изображение новости')
})

test('normalizeNewsPayload: лимит пунктов и длины пункта', () => {
  const tooMany = normalizeNewsPayload({
    title: 'Тест',
    items: Array.from({ length: NEWS_LIMITS.ITEMS_MAX + 1 }, (_, i) => `p${i}`),
  })
  assert.equal(tooMany.error, `Не больше ${NEWS_LIMITS.ITEMS_MAX} пунктов`)

  const tooLong = normalizeNewsPayload({
    title: 'Тест',
    items: ['x'.repeat(NEWS_LIMITS.ITEM_MAX + 1)],
  })
  assert.equal(tooLong.error, `Пункт длиннее ${NEWS_LIMITS.ITEM_MAX} символов`)
})

test('filterUnreadNews: lastSeenNewsAt = null — все непрочитанные', () => {
  const news = [
    { _id: '1', publishedAt: '2026-09-01T10:00:00.000Z' },
    { _id: '2', publishedAt: '2026-09-05T10:00:00.000Z' },
  ]
  assert.deepEqual(
    filterUnreadNews(news, null).map((item) => item._id),
    ['1', '2']
  )
})

test('filterUnreadNews: возвращает только опубликованные после прочтения', () => {
  const news = [
    { _id: '1', publishedAt: '2026-09-01T10:00:00.000Z' },
    { _id: '2', publishedAt: '2026-09-05T10:00:00.000Z' },
  ]
  assert.deepEqual(
    filterUnreadNews(news, '2026-09-03T10:00:00.000Z').map(
      (item) => item._id
    ),
    ['2']
  )
})

test('filterUnreadNews: битые входные данные не роняют функцию', () => {
  assert.deepEqual(filterUnreadNews(null, null), [])
  assert.deepEqual(
    filterUnreadNews([{ _id: '1' }, { _id: '2', publishedAt: 'junk' }], 'junk'),
    []
  )
})

test('getLatestUnreadNews возвращает самую свежую непрочитанную независимо от порядка', () => {
  const latest = getLatestUnreadNews(
    [
      { _id: 'middle', publishedAt: '2026-09-05T10:00:00.000Z' },
      { _id: 'latest', publishedAt: '2026-09-10T10:00:00.000Z' },
      { _id: 'old', publishedAt: '2026-09-01T10:00:00.000Z' },
    ],
    '2026-09-03T10:00:00.000Z'
  )

  assert.equal(latest?._id, 'latest')
})

test('buildNewsToastLabel: pluralization и версия', () => {
  assert.equal(buildNewsToastLabel(1, '1.18.0'), '1 нововведение · 1.18.0')
  assert.equal(buildNewsToastLabel(3, '1.18.0'), '3 нововведения · 1.18.0')
  assert.equal(buildNewsToastLabel(5, '1.18.0'), '5 нововведений · 1.18.0')
  assert.equal(buildNewsToastLabel(2, ''), '2 нововведения')
  assert.equal(buildNewsToastLabel(21, null), '21 нововведение')
})

test('resolveNewsUploadUrl поддерживает ответы EscalionCloud', () => {
  assert.equal(
    resolveNewsUploadUrl([
      { secure_url: 'https://cloud.escalion.ru/uploads/news/image.webp' },
    ]),
    'https://cloud.escalion.ru/uploads/news/image.webp'
  )
  assert.equal(
    resolveNewsUploadUrl([{ path: 'artistcrm/news/draft/image 2.webp' }]),
    'https://cloud.escalion.ru/uploads/artistcrm/news/draft/image%202.webp'
  )
  assert.equal(
    resolveNewsUploadUrl([{ fileName: 'image 3.webp' }], {
      directory: 'news/draft',
    }),
    'https://cloud.escalion.ru/uploads/artistcrm/news/draft/image%203.webp'
  )
  assert.equal(
    resolveNewsUploadUrl(['image 4.webp'], { directory: 'news/draft' }),
    'https://cloud.escalion.ru/uploads/artistcrm/news/draft/image%204.webp'
  )
})
