# Блок «Что нового» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ненавязчивые уведомления пользователей кабинета о нововведениях платформы: тост + колокольчик с бейджем + модалка-архив, наполнение через БД и админку dev-роли.

**Architecture:** Новости хранятся в глобальной коллекции `news` (без tenantId — осознанное исключение, записи едины для платформы). Опубликованные новости приезжают в общем payload `fetchProps` → `newsAtom`; непрочитанные вычисляются селектором по `loggedUser.lastSeenNewsAt`. Прочтение = открытие модалки (`POST /api/news/seen`). Админка dev — отдельная страница кабинета с CRUD через API.

**Уточнение UX (2026-09-11):** бейдж колокольчика контрастно показывает количество непрочитанных. При открытии архива раскрывается только самая свежая непрочитанная новость. `POST /api/news/seen` получает её `publishedAt` и обновляет отметку через `$max`; при пустом архиве запрос не отправляется.

**Tech Stack:** Next.js App Router, React, Jotai, Mongoose (MongoDB), Tailwind CSS, `node --test` для юнит-тестов.

**Spec:** `docs/superpowers/specs/2026-09-08-whats-new-notifications-design.md`

> Дополнение от 2026-09-11: по решению пользователя текст новости переведён с textarea на TipTap. Добавлено поле `contentHtml`, серверная HTML-санитизация, загрузка изображений в EscalionCloud и обратная совместимость с существующими `items[]`.

## Global Constraints

- Язык UI-текстов и коммитов — русский (коммиты в стиле `feat: ...` / `fix: ...` как в истории репозитория).
- API: успех — `NextResponse.json({ success: true, data }, { status: 200|201 })`, ошибка — `{ success: false, error: '<текст по-русски>' }` с корректным status.
- Авторизация всех API — `getRequestContext(req)` (поддерживает web и mobile Bearer); мутации новостей — только `user.role === 'dev'` (403 иначе).
- Коллекция `news` глобальна: `tenantId` в схеме НЕТ, фильтры по tenantId в news-роутах НЕ используются. Не «исправлять» это.
- Тесты — `node --test`, чистая логика в plain `.mjs`/`.js` модулях без `@alias`-импортов (alias не резолвится в node).
- Линт — только точечный `npx eslint <файлы>`; `npm run lint` не запускать.
- Mobile-first: интерактивные элементы с `cursor-pointer`; на телефоне тост — во всю ширину с отступами, над `MobileBottomNav`.
- Полноразмерные статусные плашки (ошибки/успех) — через `components/Notice.js` с `tone`.
- Мобильный клиент (`/mobile`) не трогаем; новые API аддитивны, существующие контракты не меняются.
- Версия приложения в финале: `1.17.8 → 1.18.0` (minor — новая функциональность без breaking changes).

## Структура файлов

**Новые:**
- `helpers/whatsNew.mjs` — чистая логика: `parseItemsText`, `normalizeNewsPayload`, `filterUnreadNews`, `buildNewsToastLabel`, `NEWS_LIMITS`.
- `helpers/whatsNew.test.js` — тесты чистой логики.
- `schemas/newsSchema.js` + `schemas/newsSchema.test.js` — схема и её валидация.
- `models/News.js` — mongoose-модель.
- `app/api/news/route.js` — GET (список) + POST (создание, dev).
- `app/api/news/[id]/route.js` — PUT + DELETE (dev).
- `app/api/news/seen/route.js` — POST (отметка прочтения).
- `state/atoms/newsAtom.js`, `state/atoms/whatsNewToastDismissedAtom.js`.
- `state/selectors/unreadNewsSelector.js`.
- `layouts/modals/modalsFunc/whatsNewFunc.js` — модалка «Что нового» (просмотр + прочтение).
- `layouts/modals/modalsFunc/newsFunc.js` — модалка редактора новости (dev).
- `components/WhatsNewToast.js` — всплывающий тост.
- `layouts/content/SiteNewsContent.js` — админка новостей (dev).

**Изменяемые:**
- `schemas/usersSchema.js` — поле `lastSeenNewsAt`.
- `server/fetchProps.js` — payload `news` (+ дефолт `news: []`).
- `helpers/useCabinetStateHydration.js` — гидрация `newsAtom`.
- `layouts/modals/modalsFuncGenerator.js` — регистрация `whatsNew.view`, `news.add`, `news.edit`.
- `layouts/CabinetHeader.js` — кнопка-колокольчик.
- `layouts/wrappers/CabinetWrapper.js` — монтирование тоста.
- `helpers/constants.js` — пункт меню «Новости платформы» (id 34, group 10, dev).
- `layouts/content/contentsMap.js` — маппинг `site-news`.
- `docs/ROADMAP.md`, `package.json` — финал.

---

### Task 1: Чистая логика новостей `helpers/whatsNew.mjs`

**Files:**
- Create: `helpers/whatsNew.mjs`
- Test: `helpers/whatsNew.test.js`

**Interfaces:**
- Consumes: ничего (self-contained).
- Produces:
  - `NEWS_LIMITS` — `{ TITLE_MAX: 120, VERSION_MAX: 20, ITEMS_MAX: 20, ITEM_MAX: 300 }`.
  - `parseItemsText(text: string) => string[]` — textarea → массив пунктов.
  - `normalizeNewsPayload(body) => { error: string } | { error: null, value: { title, version, items, isPublished } }` — валидация payload API. Принимает пункты как `items: string[]` или `itemsText: string` (textarea админки).
  - `filterUnreadNews(news: array, lastSeenNewsAt: string|Date|null) => array` — непрочитанные.
  - `buildNewsToastLabel(unreadCount: number, latestVersion: string) => string` — «3 нововведения · 1.18.0».

- [ ] **Step 1: Написать падающий тест**

Создать `helpers/whatsNew.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  NEWS_LIMITS,
  buildNewsToastLabel,
  filterUnreadNews,
  normalizeNewsPayload,
  parseItemsText,
} from './whatsNew.mjs'

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
  assert.equal(error, 'Добавьте хотя бы один пункт нововведения')
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
    filterUnreadNews(news, '2026-09-03T10:00:00.000Z').map((item) => item._id),
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

test('buildNewsToastLabel: pluralization и версия', () => {
  assert.equal(buildNewsToastLabel(1, '1.18.0'), '1 нововведение · 1.18.0')
  assert.equal(buildNewsToastLabel(3, '1.18.0'), '3 нововведения · 1.18.0')
  assert.equal(buildNewsToastLabel(5, '1.18.0'), '5 нововведений · 1.18.0')
  assert.equal(buildNewsToastLabel(2, ''), '2 нововведения')
  assert.equal(buildNewsToastLabel(21, null), '21 нововведение')
})
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test helpers/whatsNew.test.js`
Expected: FAIL (`Cannot find module './whatsNew.mjs'`)

- [ ] **Step 3: Написать реализацию**

Создать `helpers/whatsNew.mjs`:

```js
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
  if (title.length > NEWS_LIMITS.TITLE_MAX)
    return {
      error: `Заголовок длиннее ${NEWS_LIMITS.TITLE_MAX} символов`,
      value: null,
    }

  const version = typeof body?.version === 'string' ? body.version.trim() : ''
  if (version.length > NEWS_LIMITS.VERSION_MAX)
    return {
      error: `Версия длиннее ${NEWS_LIMITS.VERSION_MAX} символов`,
      value: null,
    }

  const items = Array.isArray(body?.items)
    ? body.items.map((item) => String(item ?? '').trim()).filter(Boolean)
    : parseItemsText(body?.itemsText)
  if (items.length === 0)
    return { error: 'Добавьте хотя бы один пункт нововведения', value: null }
  if (items.length > NEWS_LIMITS.ITEMS_MAX)
    return { error: `Не больше ${NEWS_LIMITS.ITEMS_MAX} пунктов`, value: null }
  if (items.some((item) => item.length > NEWS_LIMITS.ITEM_MAX))
    return {
      error: `Пункт длиннее ${NEWS_LIMITS.ITEM_MAX} символов`,
      value: null,
    }

  return {
    error: null,
    value: {
      title,
      version,
      items,
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
```

- [ ] **Step 4: Запустить тест — все кейсы зелёные**

Run: `node --test helpers/whatsNew.test.js`
Expected: PASS (11 тестов, 0 fail)

- [ ] **Step 5: Commit**

```bash
git add helpers/whatsNew.mjs helpers/whatsNew.test.js
git commit -m "feat: чистая логика блока «Что нового» (валидация, непрочитанные, подписи)"
```

---

### Task 2: Схема и модель News, поле `lastSeenNewsAt` у пользователя

**Files:**
- Create: `schemas/newsSchema.js`
- Create: `models/News.js`
- Modify: `schemas/usersSchema.js` (после поля `personalDataProcessingAcceptedAt`, ~строка 69)
- Test: `schemas/newsSchema.test.js`

**Interfaces:**
- Consumes: ничего из Task 1 напрямую (лимиты дублируются числами — схема должна быть plain-объектом для node-теста; `NEWS_LIMITS` можно импортировать, т.к. `whatsNew.mjs` тоже plain).
- Produces: mongoose-модель `@models/News` с полями `{ title, version, items, isPublished, publishedAt, createdBy, createdAt, updatedAt }`; `usersSchema.lastSeenNewsAt`.

- [ ] **Step 1: Написать падающий тест схемы**

Создать `schemas/newsSchema.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import newsSchema from './newsSchema.js'

const NewsSchemaTest = mongoose.model(
  'NewsSchemaTest',
  new mongoose.Schema(newsSchema, { timestamps: true })
)

test('newsSchema: пустой массив items не проходит валидацию', async () => {
  const doc = new NewsSchemaTest({ title: 'Тест', items: [] })
  await assert.rejects(doc.validate())
})

test('newsSchema: больше 20 пунктов не проходит валидацию', async () => {
  const doc = new NewsSchemaTest({
    title: 'Тест',
    items: Array.from({ length: 21 }, (_, i) => `p${i}`),
  })
  await assert.rejects(doc.validate())
})

test('newsSchema: валидный документ проходит, дефолты корректны', async () => {
  const doc = new NewsSchemaTest({ title: 'Тест', items: ['Пункт'] })
  await doc.validate()
  assert.equal(doc.isPublished, false)
  assert.equal(doc.publishedAt, null)
  assert.equal(doc.version, '')
})
```

- [ ] **Step 2: Запустить тест — падает**

Run: `node --test schemas/newsSchema.test.js`
Expected: FAIL (`Cannot find module './newsSchema.js'`)

- [ ] **Step 3: Схема, модель, поле пользователя**

Создать `schemas/newsSchema.js`:

```js
import { Schema } from 'mongoose'

const newsSchema = {
  title: {
    type: String,
    maxlength: 120,
    default: '',
  },
  version: {
    type: String,
    maxlength: 20,
    default: '',
  },
  items: {
    type: [{ type: String, maxlength: 300 }],
    default: [],
    validate: {
      validator: (value) =>
        Array.isArray(value) && value.length >= 1 && value.length <= 20,
      message: 'Новость должна содержать от 1 до 20 пунктов',
    },
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
}

export default newsSchema
```

Создать `models/News.js`:

```js
import mongoose from 'mongoose'
import newsSchema from '@schemas/newsSchema'

const NewsSchema = new mongoose.Schema(newsSchema, {
  timestamps: true,
})
NewsSchema.index({ isPublished: 1, publishedAt: -1 })

export default mongoose.models.News || mongoose.model('News', NewsSchema)
```

В `schemas/usersSchema.js` после блока `personalDataProcessingAcceptedAt: { type: Date, default: null, },` вставить:

```js
  lastSeenNewsAt: {
    type: Date,
    default: null,
  },
```

- [ ] **Step 4: Запустить тесты — зелёные**

Run: `node --test schemas/newsSchema.test.js`
Expected: PASS (3 теста, 0 fail)

- [ ] **Step 5: Commit**

```bash
git add schemas/newsSchema.js schemas/newsSchema.test.js models/News.js schemas/usersSchema.js
git commit -m "feat: коллекция news и поле lastSeenNewsAt у пользователя"
```

---

### Task 3: API роуты новостей

**Files:**
- Create: `app/api/news/route.js` (GET, POST)
- Create: `app/api/news/[id]/route.js` (PUT, DELETE)
- Create: `app/api/news/seen/route.js` (POST)

**Interfaces:**
- Consumes: `@models/News` (Task 2), `normalizeNewsPayload` из `@helpers/whatsNew.mjs` (Task 1), `getRequestContext` из `@server/getRequestContext`, `@server/dbConnect`.
- Produces (контракты, на которые опираются Task 5 и Task 7):
  - `GET /api/news` → `{ success: true, data: News[] }` (опубликованные, `publishedAt desc`, лимит 50); `GET /api/news?all=1` — все записи, только dev, `createdAt desc`.
  - `POST /api/news` body `{ title, version?, items? | itemsText?, isPublished? }` → 201 `{ success: true, data: News }`; 400 `{ success: false, error }` при невалидном payload.
  - `PUT /api/news/[id]` — то же тело → `{ success: true, data: News }`; 404 если нет записи; переход `isPublished false→true` выставляет `publishedAt = now`.
  - `DELETE /api/news/[id]` → `{ success: true, data: { deletedId } }`; 404 если нет записи.
  - `POST /api/news/seen` → `{ success: true, data: { lastSeenNewsAt } }` — выставляет текущему пользователю `lastSeenNewsAt = now`.
  - Ошибки авторизации: 401 `Не авторизован`; не-dev на мутациях/`?all=1`: 403 `Недостаточно прав`.

Примечание: статический сегмент `seen` в App Router приоритетнее динамического `[id]` — конфликта роутов нет. В `[id]`-роутах id валидируется через `mongoose.Types.ObjectId.isValid`.

- [ ] **Step 1: Создать `app/api/news/route.js`**

```js
import { NextResponse } from 'next/server'
import News from '@models/News'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { normalizeNewsPayload } from '@helpers/whatsNew.mjs'

const NEWS_LIST_LIMIT = 50

export const GET = async (req) => {
  try {
    const { tenantId, user } = await getRequestContext(req)
    if (!tenantId || !user?._id) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const includeAll = searchParams.get('all') === '1'
    if (includeAll && user?.role !== 'dev') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      )
    }

    await dbConnect()
    const news = await News.find(includeAll ? {} : { isPublished: true })
      .sort(includeAll ? { createdAt: -1 } : { publishedAt: -1 })
      .limit(NEWS_LIST_LIMIT)
      .lean()

    return NextResponse.json({ success: true, data: news }, { status: 200 })
  } catch (error) {
    console.error('GET /api/news error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export const POST = async (req) => {
  try {
    const { tenantId, user } = await getRequestContext(req)
    if (!tenantId || !user?._id) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }
    if (user?.role !== 'dev') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    const { error, value } = normalizeNewsPayload(body)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    await dbConnect()
    const created = await News.create({
      ...value,
      publishedAt: value.isPublished ? new Date() : null,
      createdBy: user._id,
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('POST /api/news error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Создать `app/api/news/[id]/route.js`**

```js
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import News from '@models/News'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { normalizeNewsPayload } from '@helpers/whatsNew.mjs'

const checkDevAccess = async (req) => {
  const { tenantId, user } = await getRequestContext(req)
  if (!tenantId || !user?._id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      ),
    }
  }
  if (user?.role !== 'dev') {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      ),
    }
  }
  return { user }
}

export const PUT = async (req, { params }) => {
  try {
    const { id } = await params
    const { errorResponse } = await checkDevAccess(req)
    if (errorResponse) return errorResponse
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { success: false, error: 'Некорректный идентификатор' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)
    const { error, value } = normalizeNewsPayload(body)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    await dbConnect()
    const doc = await News.findById(id)
    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Новость не найдена' },
        { status: 404 }
      )
    }

    const publishedAt =
      doc.isPublished !== true && value.isPublished
        ? new Date()
        : doc.publishedAt
    doc.set({ ...value, publishedAt })
    await doc.save()

    return NextResponse.json({ success: true, data: doc }, { status: 200 })
  } catch (error) {
    console.error('PUT /api/news/[id] error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export const DELETE = async (req, { params }) => {
  try {
    const { id } = await params
    const { errorResponse } = await checkDevAccess(req)
    if (errorResponse) return errorResponse
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { success: false, error: 'Некорректный идентификатор' },
        { status: 400 }
      )
    }

    await dbConnect()
    const deleted = await News.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Новость не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: { deletedId: String(id) } },
      { status: 200 }
    )
  } catch (error) {
    console.error('DELETE /api/news/[id] error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Создать `app/api/news/seen/route.js`**

```js
import { NextResponse } from 'next/server'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'

export const POST = async (req) => {
  try {
    const { tenantId, user } = await getRequestContext(req)
    if (!tenantId || !user?._id) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    await dbConnect()
    const lastSeenNewsAt = new Date()
    await Users.updateOne(
      { _id: user._id },
      { $set: { lastSeenNewsAt } }
    )

    return NextResponse.json(
      { success: true, data: { lastSeenNewsAt } },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/news/seen error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Линт новых файлов**

Run: `npx eslint app/api/news/route.js "app/api/news/[id]/route.js" app/api/news/seen/route.js`
Expected: без ошибок (warnings по `console` допустимы — в существующих API они есть)

- [ ] **Step 5: Commit**

```bash
git add app/api/news
git commit -m "feat: API новостей платформы (CRUD для dev, отметка прочтения)"
```

---

### Task 4: Доставка данных — fetchProps, атомы, селектор, гидрация

**Files:**
- Modify: `server/fetchProps.js` (импорт, `buildSafeDefaultPayload`, `Promise.all`, `fetchResult`)
- Create: `state/atoms/newsAtom.js`
- Create: `state/atoms/whatsNewToastDismissedAtom.js`
- Create: `state/selectors/unreadNewsSelector.js`
- Modify: `helpers/useCabinetStateHydration.js`

**Interfaces:**
- Consumes: `@models/News` (Task 2), `filterUnreadNews` из `@helpers/whatsNew.mjs` (Task 1).
- Produces:
  - `props.news` в `StateLoader`/кабинете — массив опубликованных новостей (`publishedAt desc`, ≤ 50).
  - `newsAtom` (default `[]`), `whatsNewToastDismissedAtom` (default `false`, сбрасывается при перезаходе на страницу — обычный atom).
  - `unreadNewsSelector` — `News[]`, отсортированные как в `newsAtom` (т.е. свежие первыми); `unreadNews[0]` — последняя новость.

- [ ] **Step 1: fetchProps — импорт и дефолтный payload**

В `server/fetchProps.js` после строки `import Users from '@models/Users'` добавить:

```js
import News from '@models/News'
```

В `buildSafeDefaultPayload` после `transactions: [],` добавить строку:

```js
  news: [],
```

- [ ] **Step 2: fetchProps — запрос и результат**

Заменить деструктуризацию `Promise.all`:

```js
    const [
      eventsPayload,
      siteSettings,
      tariffs,
      users,
      loggedUser,
    ] = await Promise.all([
```

на:

```js
    const [
      eventsPayload,
      siteSettings,
      tariffs,
      users,
      loggedUser,
      newsList,
    ] = await Promise.all([
```

и в сам массив `Promise.all` после `user?._id ? Users.findById(user._id).select('-password').lean() : null,` добавить:

```js
      News.find({ isPublished: true })
        .sort({ publishedAt: -1 })
        .limit(50)
        .lean(),
```

В `fetchResult` после `transactions: JSON.parse(JSON.stringify(transactions)),` добавить:

```js
      news: JSON.parse(JSON.stringify(newsList)),
```

- [ ] **Step 3: Атомы и селектор**

Создать `state/atoms/newsAtom.js`:

```js
import { atom } from 'jotai'

const newsAtom = atom([])

export default newsAtom
```

Создать `state/atoms/whatsNewToastDismissedAtom.js`:

```js
import { atom } from 'jotai'

const whatsNewToastDismissedAtom = atom(false)

export default whatsNewToastDismissedAtom
```

Создать `state/selectors/unreadNewsSelector.js`:

```js
import { atom } from 'jotai'
import newsAtom from '@state/atoms/newsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { filterUnreadNews } from '@helpers/whatsNew.mjs'

const unreadNewsSelector = atom((get) =>
  filterUnreadNews(get(newsAtom), get(loggedUserAtom)?.lastSeenNewsAt)
)

export default unreadNewsSelector
```

- [ ] **Step 4: Гидрация `newsAtom`**

В `helpers/useCabinetStateHydration.js`:

1. После `import loggedUserAtom from '@state/atoms/loggedUserAtom'` добавить:

```js
import newsAtom from '@state/atoms/newsAtom'
```

2. В деструктуризацию props добавить `news: initialNews,` (после `loggedUser: initialLoggedUser,`).

3. После `const setLoggedUser = useSetAtom(loggedUserAtom)` добавить:

```js
  const setNews = useSetAtom(newsAtom)
```

4. В основном `useEffect` после `const users = Array.isArray(initialUsers) ? initialUsers : []` добавить:

```js
    const news = Array.isArray(initialNews) ? initialNews : []
```

и после `setSiteSettings(initialSiteSettings ?? {})` добавить:

```js
    setNews(news)
```

5. В массив зависимостей этого `useEffect` добавить `initialNews` (после `initialLoggedUser`) и `setNews` (после `setLoggedUser`).

- [ ] **Step 5: Линт и commit**

Run: `npx eslint server/fetchProps.js state/atoms/newsAtom.js state/atoms/whatsNewToastDismissedAtom.js state/selectors/unreadNewsSelector.js helpers/useCabinetStateHydration.js`
Expected: без ошибок

```bash
git add server/fetchProps.js state/atoms/newsAtom.js state/atoms/whatsNewToastDismissedAtom.js state/selectors/unreadNewsSelector.js helpers/useCabinetStateHydration.js
git commit -m "feat: доставка новостей в кабинет через fetchProps и jotai-атомы"
```

---

### Task 5: Модалка «Что нового» (просмотр + прочтение)

**Files:**
- Create: `layouts/modals/modalsFunc/whatsNewFunc.js`
- Modify: `layouts/modals/modalsFuncGenerator.js` (импорт + регистрация `whatsNew.view`)

**Interfaces:**
- Consumes: `newsAtom`, `loggedUserAtom` (Task 4), `filterUnreadNews` (Task 1), `POST /api/news/seen` (Task 3), `FormWrapper` (`@components/FormWrapper`), паттерн модалок: func возвращает `{ title, Children, ... }`, открытие через `addModal`.
- Produces: `modalsFunc.whatsNew.view()` — открывает модалку. Используется в Task 6 (колокольчик, тост).

Поведение модалки:
- При открытии: snapshot `lastSeenNewsAt` (через `useState(() => ...)`), затем `POST /api/news/seen` и оптимистичное обновление `loggedUserAtom` — бейдж гаснет сразу; ошибка запроса проглатывается (`catch(() => null)`).
- «Свежие» новости (после snapshot'а) — раскрыты и помечены точкой; остальные — свёрнуты, раскрываются кликом по шапке элемента.

- [ ] **Step 1: Создать `layouts/modals/modalsFunc/whatsNewFunc.js`**

```js
import { useEffect, useMemo, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import FormWrapper from '@components/FormWrapper'
import newsAtom from '@state/atoms/newsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { filterUnreadNews } from '@helpers/whatsNew.mjs'

const formatNewsDate = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('ru-RU')
    : ''
}

const whatsNewFunc = () => {
  const WhatsNewModal = () => {
    const news = useAtomValue(newsAtom)
    const loggedUser = useAtomValue(loggedUserAtom)
    const setLoggedUser = useSetAtom(loggedUserAtom)

    // Снапшот «что непрочитано» на момент открытия — свежие подсвечиваем,
    // даже после того как seen-запрос обновит loggedUserAtom.
    const [seenSnapshot] = useState(() => loggedUser?.lastSeenNewsAt ?? null)
    const freshIds = useMemo(
      () =>
        new Set(
          filterUnreadNews(news, seenSnapshot).map((item) => String(item?._id))
        ),
      [news, seenSnapshot]
    )
    const [collapsedIds, setCollapsedIds] = useState(
      () =>
        new Set(
          (Array.isArray(news) ? news : [])
            .filter((item) => !freshIds.has(String(item?._id)))
            .map((item) => String(item?._id))
        )
    )

    // Открытие модалки = прочтение всех новостей
    useEffect(() => {
      const seenAt = new Date().toISOString()
      fetch('/api/news/seen', { method: 'POST' })
        .then((res) => (res.ok ? res.json() : null))
        .then(() => {
          setLoggedUser((prev) =>
            prev ? { ...prev, lastSeenNewsAt: seenAt } : prev
          )
        })
        .catch(() => null)
    }, [setLoggedUser])

    const toggleItem = (id) =>
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })

    const items = Array.isArray(news) ? news : []

    if (items.length === 0) {
      return (
        <FormWrapper className="flex h-full flex-col">
          <div className="py-6 text-center text-sm text-gray-500">
            Новостей пока нет
          </div>
        </FormWrapper>
      )
    }

    return (
      <FormWrapper className="flex h-full flex-col gap-2">
        {items.map((item) => {
          const id = String(item?._id ?? '')
          const isFresh = freshIds.has(id)
          const isCollapsed = collapsedIds.has(id)
          return (
            <div
              key={id}
              className="overflow-hidden rounded-lg border border-gray-200"
            >
              <button
                type="button"
                onClick={() => toggleItem(id)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-gray-50"
              >
                <FontAwesomeIcon
                  icon={isCollapsed ? faChevronRight : faChevronDown}
                  className="h-3 w-3 shrink-0 text-gray-400"
                />
                {item?.version ? (
                  <span className="shrink-0 rounded bg-[var(--ui-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ui-primary-text)]">
                    {item.version}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">
                  {item?.title}
                </span>
                {isFresh ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[var(--ui-primary)]"
                    title="Новое"
                  />
                ) : null}
                <span className="shrink-0 text-xs text-gray-400">
                  {formatNewsDate(item?.publishedAt)}
                </span>
              </button>
              {!isCollapsed && (
                <ul className="list-disc space-y-1 pb-3 pl-10 pr-3 text-sm text-gray-700">
                  {(Array.isArray(item?.items) ? item.items : []).map(
                    (text, index) => (
                      <li key={index}>{text}</li>
                    )
                  )}
                </ul>
              )}
            </div>
          )
        })}
      </FormWrapper>
    )
  }

  return {
    title: 'Что нового',
    Children: WhatsNewModal,
    onlyCloseButtonShow: true,
    closeButtonName: 'Закрыть',
  }
}

export default whatsNewFunc
```

- [ ] **Step 2: Регистрация в `modalsFuncGenerator.js`**

После строки `import townsFunc from './modalsFunc/townsFunc'` добавить:

```js
import whatsNewFunc from './modalsFunc/whatsNewFunc'
```

После блока:

```js
    settings: {
      towns: () => addModal(townsFunc()),
      eventTypes: () => addModal(eventTypesFunc()),
      artistRequisitesEditor: () => addModal(artistRequisitesEditorFunc()),
    },
```

добавить:

```js
    whatsNew: {
      view: () => addModal(whatsNewFunc()),
    },
```

- [ ] **Step 3: Линт и commit**

Run: `npx eslint layouts/modals/modalsFunc/whatsNewFunc.js layouts/modals/modalsFuncGenerator.js`
Expected: без ошибок

```bash
git add layouts/modals/modalsFunc/whatsNewFunc.js layouts/modals/modalsFuncGenerator.js
git commit -m "feat: модалка «Что нового» с архивом и отметкой прочтения"
```

---

### Task 6: Колокольчик в шапке и всплывающий тост

**Files:**
- Modify: `layouts/CabinetHeader.js`
- Create: `components/WhatsNewToast.js`
- Modify: `layouts/wrappers/CabinetWrapper.js`

**Interfaces:**
- Consumes: `unreadNewsSelector`, `whatsNewToastDismissedAtom` (Task 4), `modalsFunc.whatsNew.view()` (Task 5), `buildNewsToastLabel` (Task 1).
- Produces: визуальные точки входа; ничего наружу не экспортирует.

Поведение:
- Колокольчик виден всегда; бейдж с числом — только при `unreadNews.length > 0`.
- Тост: показывается при `unreadNews.length > 0 && !dismissed`; крестик → `setDismissed(true)` (до конца сессии); «Подробнее» → `modalsFunc.whatsNew?.view()`. Позиция: над `MobileBottomNav` на телефоне (`bottom-20`), в правом нижнем углу на десктопе; `z-40` — ниже модалок (`z-50`).

- [ ] **Step 1: Колокольчик в `layouts/CabinetHeader.js`**

Заменить блок импортов:

```js
import Link from 'next/link'
import UserMenu from './UserMenu'
```

на:

```js
import Link from 'next/link'
import { useAtomValue } from 'jotai'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell } from '@fortawesome/free-solid-svg-icons'
import UserMenu from './UserMenu'
import unreadNewsSelector from '@state/selectors/unreadNewsSelector'
import { modalsFuncAtom } from '@state/atoms'
```

В начале компонента `CabinetHeader` (после строки `const CabinetHeader = ({ title = '', titleLink, icon, count = null }) => {`) добавить:

```js
  const unreadNews = useAtomValue(unreadNewsSelector)
  const modalsFunc = useAtomValue(modalsFuncAtom)
```

Перед `<UserMenu />` вставить кнопку:

```js
      <button
        type="button"
        onClick={() => modalsFunc.whatsNew?.view()}
        className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        title="Что нового"
      >
        <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
        {unreadNews.length > 0 ? (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ui-primary)] px-1 text-[10px] font-bold text-[var(--ui-primary-text)]">
            {unreadNews.length}
          </span>
        ) : null}
      </button>
```

- [ ] **Step 2: Создать `components/WhatsNewToast.js`**

```js
'use client'

import { useAtom, useAtomValue } from 'jotai'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBullhorn, faXmark } from '@fortawesome/free-solid-svg-icons'
import unreadNewsSelector from '@state/selectors/unreadNewsSelector'
import whatsNewToastDismissedAtom from '@state/atoms/whatsNewToastDismissedAtom'
import { modalsFuncAtom } from '@state/atoms'
import { buildNewsToastLabel } from '@helpers/whatsNew.mjs'

const WhatsNewToast = () => {
  const unreadNews = useAtomValue(unreadNewsSelector)
  const [dismissed, setDismissed] = useAtom(whatsNewToastDismissedAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)

  if (dismissed || unreadNews.length === 0) return null

  return (
    <div className="tablet:bottom-6 tablet:left-auto tablet:right-6 tablet:w-80 fixed bottom-20 left-3 right-3 z-40 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ui-primary)] text-[var(--ui-primary-text)]">
          <FontAwesomeIcon icon={faBullhorn} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-800">Что нового</div>
          <div className="text-xs text-gray-500">
            {buildNewsToastLabel(unreadNews.length, unreadNews[0]?.version)}
          </div>
          <button
            type="button"
            onClick={() => modalsFunc.whatsNew?.view()}
            className="mt-2 cursor-pointer rounded-lg bg-[var(--ui-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-primary-text)] transition hover:opacity-90"
          >
            Подробнее
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          title="Скрыть до следующего входа"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default WhatsNewToast
```

- [ ] **Step 3: Монтирование в `layouts/wrappers/CabinetWrapper.js`**

После `import MobileBottomNav from '@components/MobileBottomNav'` добавить:

```js
import WhatsNewToast from '@components/WhatsNewToast'
```

После `<MobileBottomNav />` добавить:

```js
      <WhatsNewToast />
```

- [ ] **Step 4: Линт и commit**

Run: `npx eslint layouts/CabinetHeader.js components/WhatsNewToast.js layouts/wrappers/CabinetWrapper.js`
Expected: без ошибок

```bash
git add layouts/CabinetHeader.js components/WhatsNewToast.js layouts/wrappers/CabinetWrapper.js
git commit -m "feat: колокольчик с бейджем в шапке и тост о нововведениях"
```

---

### Task 7: Админка новостей для dev (страница + редактор)

**Files:**
- Modify: `helpers/constants.js` (импорт `faNewspaper` + пункт меню id 34)
- Modify: `layouts/content/contentsMap.js` (импорт + маппинг `site-news`)
- Create: `layouts/content/SiteNewsContent.js`
- Create: `layouts/modals/modalsFunc/newsFunc.js`
- Modify: `layouts/modals/modalsFuncGenerator.js` (импорт + регистрация `news.add` / `news.edit`)

**Interfaces:**
- Consumes: API Task 3 (`GET ?all=1`, POST, PUT, DELETE), `modalsFunc.confirm({ title, text, onConfirm })`, `postData`/`putData`/`deleteData` из `@helpers/CRUD` (callbackOnSuccess получает `json.data`), `Input` (`@components/Input`, `onChange(value)`), `parseItemsText` (Task 1), паттерн `TariffsContent` (`ContentHeader`, `HeaderActions`, `AddIconButton`, `SectionCard`, `EmptyState`, `MutedText`).
- Produces: `modalsFunc.news.add(onSaved)`, `modalsFunc.news.edit(newsItem, onSaved)`; страница `/cabinet/site-news` (только dev — дублируется проверкой `accessRoles` в `pages` и 403 в API).

- [ ] **Step 1: Пункт меню в `helpers/constants.js`**

В импорте из `@fortawesome/free-solid-svg-icons` после строки `  faGift,` добавить:

```js
  faNewspaper,
```

После блока меню `{ id: 29, ... href: 'registration-trial', ... },` (и перед `{ id: 32, ... 'feedback' ... }`) вставить:

```js
  {
    id: 34,
    group: 10,
    name: 'Новости платформы',
    href: 'site-news',
    icon: faNewspaper,
    accessRoles: ['dev'],
  },
```

- [ ] **Step 2: Маппинг в `layouts/content/contentsMap.js`**

После `import TariffsContent from './TariffsContent'` добавить:

```js
import SiteNewsContent from './SiteNewsContent'
```

В объект `CONTENTS` после записи `'site-contacts': { ... },` добавить:

```js
  'site-news': {
    Component: SiteNewsContent,
    name: 'Настройки сайта / Новости платформы',
  },
```

- [ ] **Step 3: Создать `layouts/content/SiteNewsContent.js`**

```js
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faEyeSlash,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import ContentHeader from '@components/ContentHeader'
import AddIconButton from '@components/AddIconButton'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import Notice from '@components/Notice'
import { modalsFuncAtom } from '@state/atoms'
import loggedUserActiveRoleSelector from '@state/selectors/loggedUserActiveRoleSelector'
import { deleteData, putData } from '@helpers/CRUD'

const formatDate = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('ru-RU')
    : '—'
}

const SiteNewsContent = () => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const loggedUserActiveRole = useAtomValue(loggedUserActiveRoleSelector)
  const canEdit = loggedUserActiveRole?.dev === true

  const [newsList, setNewsList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadNews = useCallback(async () => {
    setIsLoading(true)
    setErrorText('')
    try {
      const res = await fetch('/api/news?all=1')
      const json = res.ok ? await res.json() : null
      if (json?.success && Array.isArray(json.data)) {
        setNewsList(json.data)
      } else {
        setNewsList([])
        setErrorText(json?.error || 'Не удалось загрузить новости')
      }
    } catch {
      setNewsList([])
      setErrorText('Не удалось загрузить новости')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canEdit) loadNews()
  }, [canEdit, loadNews])

  const handleTogglePublish = (item) => {
    putData(
      `/api/news/${item._id}`,
      {
        title: item.title,
        version: item.version ?? '',
        items: item.items ?? [],
        isPublished: item.isPublished !== true,
      },
      () => loadNews(),
      () => setErrorText('Не удалось изменить публикацию')
    )
  }

  const handleDelete = (item) => {
    modalsFunc.confirm({
      title: 'Удаление новости',
      text: `Удалить новость «${item.title}»? Действие необратимое.`,
      onConfirm: () =>
        deleteData(
          `/api/news/${item._id}`,
          () => loadNews(),
          () => setErrorText('Не удалось удалить новость')
        ),
    })
  }

  if (!canEdit) {
    return (
      <div className="flex h-full flex-col gap-4">
        <ContentHeader />
        <SectionCard className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState text="Доступно только администраторам" bordered={false} />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {newsList.length}</MutedText>
              <AddIconButton
                onClick={() => modalsFunc.news?.add(loadNews)}
                disabled={!modalsFunc.news?.add}
                title="Добавить новость"
                size="sm"
                variant="neutral"
              />
            </>
          }
        />
      </ContentHeader>
      {errorText ? <Notice tone="error">{errorText}</Notice> : null}
      <SectionCard className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <MutedText>Загрузка…</MutedText>
        ) : newsList.length > 0 ? (
          <div className="flex flex-col gap-3">
            {newsList.map((item) => (
              <div
                key={item._id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center gap-2">
                  {item.version ? (
                    <span className="shrink-0 rounded bg-[var(--ui-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ui-primary-text)]">
                      {item.version}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">
                    {item.title}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      item.isPublished
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.isPublished ? 'Опубликована' : 'Черновик'}
                  </span>
                </div>
                <MutedText>
                  Публикация: {formatDate(item.publishedAt)} · Пунктов:{' '}
                  {(item.items ?? []).length}
                </MutedText>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => modalsFunc.news?.edit(item, loadNews)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                    title="Редактировать"
                  >
                    <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(item)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                    title={item.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                  >
                    <FontAwesomeIcon
                      icon={item.isPublished ? faEyeSlash : faEye}
                      className="h-3.5 w-3.5"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-red-200 text-red-500 transition hover:bg-red-50"
                    title="Удалить"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Новостей пока нет" bordered={false} />
        )}
      </SectionCard>
    </div>
  )
}

export default SiteNewsContent
```

- [ ] **Step 4: Создать редактор `layouts/modals/modalsFunc/newsFunc.js`**

```js
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import Notice from '@components/Notice'
import { postData, putData } from '@helpers/CRUD'
import { parseItemsText } from '@helpers/whatsNew.mjs'

const newsFunc = (newsItem = null, onSaved = null) => {
  const isEdit = Boolean(newsItem?._id)

  const NewsModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
  }) => {
    const [title, setTitle] = useState(newsItem?.title ?? '')
    const [version, setVersion] = useState(newsItem?.version ?? '')
    const [itemsText, setItemsText] = useState(
      (newsItem?.items ?? []).join('\n')
    )
    const [isPublished, setIsPublished] = useState(
      newsItem?.isPublished === true
    )
    const [saveError, setSaveError] = useState('')

    const initialItemsText = (newsItem?.items ?? []).join('\n')
    const isChanged =
      title !== (newsItem?.title ?? '') ||
      version !== (newsItem?.version ?? '') ||
      itemsText !== initialItemsText ||
      isPublished !== (newsItem?.isPublished === true)
    const canSave =
      title.trim().length > 0 &&
      parseItemsText(itemsText).length > 0 &&
      (isChanged || !isEdit)

    const handleSave = useCallback(async () => {
      setSaveError('')
      const payload = { title, version, itemsText, isPublished }
      const request = isEdit ? putData : postData
      const url = isEdit ? `/api/news/${newsItem._id}` : '/api/news'
      await request(
        url,
        payload,
        () => {
          if (typeof onSaved === 'function') onSaved()
          closeModal()
        },
        (error) =>
          setSaveError(
            error?.message || 'Не удалось сохранить новость'
          )
      )
    }, [closeModal, isPublished, itemsText, title, version])

    useEffect(() => {
      setDisableConfirm(!canSave)
      setOnShowOnCloseConfirmDialog(isChanged)
      setOnConfirmFunc(canSave ? handleSave : undefined)
    }, [
      canSave,
      isChanged,
      setDisableConfirm,
      setOnConfirmFunc,
      setOnShowOnCloseConfirmDialog,
      handleSave,
    ])

    return (
      <FormWrapper className="flex h-full flex-col gap-3">
        <Input
          label="Заголовок"
          value={title}
          onChange={setTitle}
          required
        />
        <Input
          label="Версия (необязательно, например 1.18.0)"
          value={version}
          onChange={setVersion}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600" htmlFor="news-items">
            Пункты нововведений (каждый с новой строки)
          </label>
          <textarea
            id="news-items"
            value={itemsText}
            onChange={(event) => setItemsText(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--ui-primary)]"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          Опубликована (видна пользователям)
        </label>
        {saveError ? <Notice tone="error">{saveError}</Notice> : null}
      </FormWrapper>
    )
  }

  return {
    title: isEdit ? 'Редактирование новости' : 'Новая новость',
    confirmButtonName: 'Сохранить',
    Children: NewsModal,
  }
}

export default newsFunc
```

- [ ] **Step 5: Регистрация в `modalsFuncGenerator.js`**

После строки `import whatsNewFunc from './modalsFunc/whatsNewFunc'` (добавленной в Task 5) добавить:

```js
import newsFunc from './modalsFunc/newsFunc'
```

После блока `whatsNew: { ... },` (добавленного в Task 5) добавить:

```js
    news: {
      add: (onSaved) =>
        loggedUser?.role === 'dev' ? addModal(newsFunc(null, onSaved)) : null,
      edit: (newsItem, onSaved) =>
        loggedUser?.role === 'dev'
          ? addModal(newsFunc(newsItem, onSaved))
          : null,
    },
```

- [ ] **Step 6: Линт и commit**

Run: `npx eslint helpers/constants.js layouts/content/contentsMap.js layouts/content/SiteNewsContent.js layouts/modals/modalsFunc/newsFunc.js layouts/modals/modalsFuncGenerator.js`
Expected: без ошибок

```bash
git add helpers/constants.js layouts/content/contentsMap.js layouts/content/SiteNewsContent.js layouts/modals/modalsFunc/newsFunc.js layouts/modals/modalsFuncGenerator.js
git commit -m "feat: админка новостей платформы для dev-роли"
```

---

### Task 8: Roadmap, версия, финальная проверка

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `package.json` (version)

**Interfaces:**
- Consumes: всё выше.
- Produces: закрытый пункт roadmap + minor-bump версии (правило AGENTS.md).

- [ ] **Step 1: ROADMAP**

В `docs/ROADMAP.md` перед строкой `## Activity History Track` вставить:

```md
### Product News Track: блок «Что нового»

- [x] PN-T1 Блок «Что нового»: тост + колокольчик с бейджем + модалка-архив в кабинете, коллекция `news`, API (`/api/news`, `/api/news/seen`), админка для dev (`/cabinet/site-news`), поле `lastSeenNewsAt`

```

В раздел `## Выполнено (уже сделано в проекте)` (первой строкой после заголовка раздела) добавить:

```md
- Блок «Что нового»: уведомления пользователей о нововведениях платформы (тост + колокольчик + модалка), админка новостей для dev.
```

- [ ] **Step 2: Версия**

В `package.json`: `"version": "1.17.8"` → `"version": "1.18.0"` (minor: новая функциональность без breaking changes).

- [ ] **Step 3: Полный прогон тестов и линта**

Run: `node --test helpers/whatsNew.test.js schemas/newsSchema.test.js`
Expected: PASS (14 тестов, 0 fail)

Run (одной командой, все изменённые файлы):

```bash
npx eslint helpers/whatsNew.mjs helpers/whatsNew.test.js schemas/newsSchema.js schemas/newsSchema.test.js schemas/usersSchema.js models/News.js app/api/news/route.js "app/api/news/[id]/route.js" app/api/news/seen/route.js server/fetchProps.js state/atoms/newsAtom.js state/atoms/whatsNewToastDismissedAtom.js state/selectors/unreadNewsSelector.js helpers/useCabinetStateHydration.js layouts/modals/modalsFunc/whatsNewFunc.js layouts/modals/modalsFunc/newsFunc.js layouts/modals/modalsFuncGenerator.js layouts/CabinetHeader.js components/WhatsNewToast.js layouts/wrappers/CabinetWrapper.js helpers/constants.js layouts/content/contentsMap.js layouts/content/SiteNewsContent.js
```

Expected: без ошибок

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md package.json
git commit -m "chore: roadmap PN-T1 закрыт, версия 1.18.0"
```

- [ ] **Step 5: Ручной сценарий (чеклист для пользователя, `npm run dev`)**

1. Войти под dev → меню «Новости платформы» → создать черновик → у обычного пользователя ничего не появилось.
2. Опубликовать новость → у пользователя: тост в углу + бейдж на колокольчике.
3. Крестик на тосте → тост скрыт, бейдж остался.
4. Открыть модалку (тост «Подробнее» или колокольчик) → новость подсвечена и раскрыта → закрыть → бейдж погас.
5. Перезаход на страницу → тоста и бейджа нет; архив доступен через колокольчик (новость свёрнута).
6. Опубликовать вторую новость → тост и бейдж появились снова; в модалке вторая раскрыта, первая свёрнута.
7. Проверить на узком экране (телефон): тост во всю ширину над нижней навигацией, модалка читается.
