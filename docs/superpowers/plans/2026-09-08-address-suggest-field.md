# Умное поле адреса (DaData-подсказки) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить непонятный селект пула адресов на единое умное поле «Локация»: поиск с DaData-подсказками (с координатами для навигаторов) + one-tap выбор из своих адресов + ручной ввод как fallback.

**Architecture:** Новый серверный модуль `server/dadataSuggest.mjs` (прокси к DaData + кэш + маппинг) и тонкий endpoint `app/api/address/suggest/route.js`. На клиенте новый компонент `components/AddressSuggestField.js` (поле ввода + дропдаун с секциями «Мои адреса» / подсказки / «Ввести вручную» + чип выбранного адреса), который встраивается в `components/AddressPoolPicker.js` вместо `ComboBox`. Интерфейс `AddressPoolPicker` наружу не меняется — `eventFunc.js` не трогаем.

**Tech Stack:** Next.js App Router, React, Tailwind, Jotai, DaData Suggestions API. В проекте нет тестовой инфраструктуры — вместо unit-тестов проверочный скрипт `scripts/checkDadataMapping.mjs` (node assert) + точечный `npx eslint` + ручные сценарии.

**Spec:** `docs/superpowers/specs/2026-09-08-address-suggest-field-design.md`

## Global Constraints

- Mobile-first: строки выпадающего списка ≥ 48 px высотой, крупные тач-цели.
- Минимум обращений к DaData: debounce 600 мс, минимум 4 символа, AbortController, клиентский кэш (50 записей), серверный кэш (TTL 30 мин).
- Обратная совместимость: выбранная подсказка нормализуется в тот же объект `address` (`town/street/house/latitude/longitude`), что и ручной ввод; `normalizeAddressValue` в `eventFunc.js` не меняется.
- Ключ DaData только на сервере: env `DADATA_API_KEY`; без ключа — graceful fallback (`unavailable: true`, только пул + ручной ввод).
- Не логировать `query` (адреса — чувствительные данные); только факт ошибки и HTTP-статус.
- Подсказки только до дома (`to_bound: { value: 'house' }`); подъезд/этаж/квартира/комментарий пользователь дописывает сам.
- Координаты: после выбора подсказки сервер делает уточняющий запрос `count: 1` по `unrestricted_value` — по документации DaData `geo_lat`/`geo_lon` гарантированно заполняются именно при таком «выборе».
- CRLF-окончания строк в существующих файлах проекта сохранять.
- Стиль кода проекта: без точек с запятой в конце — СМОТРЕТЬ соседние файлы (в проекте смешанно; в `components/` и `app/api/` преобладает стиль БЕЗ `;`... на самом деле в `AddressPoolPicker.js` и `app/api/site/route.js` точек с запятой НЕТ — следуем этому стилю).

---

### Task 1: Серверный модуль DaData (`server/dadataSuggest.mjs`)

**Files:**
- Create: `server/dadataSuggest.mjs`
- Create: `scripts/checkDadataMapping.mjs`

**Interfaces:**
- Produces:
  - `isDadataConfigured(): boolean`
  - `suggestAddresses({ query: string, town?: string }): Promise<{ unavailable: boolean, suggestions: Array<{ label: string, address: { town, street, house, latitude, longitude } }> }>`
  - `selectAddress({ query: string }): Promise<{ label, address } | null>` — уточняющий запрос `count: 1`
  - `mapDadataSuggestion(suggestion): { label, address }` — экспортирован для проверочного скрипта
- Consumes: env `DADATA_API_KEY`.

- [ ] **Step 1: Написать проверочный скрипт (падающий)**

Создать `scripts/checkDadataMapping.mjs`:

```js
import assert from 'node:assert/strict'
import { mapDadataSuggestion } from '../server/dadataSuggest.mjs'

// Фикстура по образцу из официальной документации dadata.ru/api/suggest/address
const houseSuggestion = {
  value: 'г Самара, ул Ленинградская, д 12 к 2',
  unrestricted_value: 'г Самара, ул Ленинградская, д 12 к 2',
  data: {
    city: 'Самара',
    settlement: null,
    street_with_type: 'ул Ленинградская',
    street: 'Ленинградская',
    house: '12',
    block_type: 'к',
    block: '2',
    geo_lat: '53.2038',
    geo_lon: '50.1606',
  },
}
const mapped = mapDadataSuggestion(houseSuggestion)
assert.equal(mapped.label, 'г Самара, ул Ленинградская, д 12 к 2')
assert.deepEqual(mapped.address, {
  town: 'Самара',
  street: 'ул Ленинградская',
  house: '12 к 2',
  latitude: '53.2038',
  longitude: '50.1606',
})

// Населённый пункт вместо города, дом без корпуса, без координат
const settlementSuggestion = {
  value: 'Самарская обл, с Константиновка, ул Центральная, д 5',
  unrestricted_value: 'Самарская обл, с Константиновка, ул Центральная, д 5',
  data: {
    city: null,
    settlement: 'Константиновка',
    street_with_type: 'ул Центральная',
    street: 'Центральная',
    house: '5',
    block_type: null,
    block: null,
    geo_lat: null,
    geo_lon: null,
  },
}
const mapped2 = mapDadataSuggestion(settlementSuggestion)
assert.deepEqual(mapped2.address, {
  town: 'Константиновка',
  street: 'ул Центральная',
  house: '5',
  latitude: '',
  longitude: '',
})

console.log('checkDadataMapping: PASS')
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node scripts/checkDadataMapping.mjs`
Expected: ошибка импорта (`Cannot find module '../server/dadataSuggest.mjs'`).

- [ ] **Step 3: Реализовать `server/dadataSuggest.mjs`**

```js
const DADATA_SUGGEST_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX_ENTRIES = 500
const REQUEST_TIMEOUT_MS = 4000
const MIN_QUERY_LENGTH = 4
const SUGGEST_COUNT = 7

// In-memory кэш: key -> { expiresAt, payload }
const cache = new Map()

const getCached = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.payload
}

const setCached = (key, payload) => {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload })
}

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '')

const formatHouse = (data) => {
  const house = trimValue(data?.house)
  const block = trimValue(data?.block)
  if (!house) return ''
  if (!block) return house
  const blockType = trimValue(data?.block_type)
  return blockType ? `${house} ${blockType} ${block}` : `${house} ${block}`
}

const mapDadataSuggestion = (suggestion) => {
  const data = suggestion?.data ?? {}
  return {
    label:
      trimValue(suggestion?.unrestricted_value) ||
      trimValue(suggestion?.value),
    address: {
      town: trimValue(data.city) || trimValue(data.settlement),
      street: trimValue(data.street_with_type) || trimValue(data.street),
      house: formatHouse(data),
      latitude: trimValue(data.geo_lat),
      longitude: trimValue(data.geo_lon),
    },
  }
}

const isDadataConfigured = () => Boolean(process.env.DADATA_API_KEY)

const requestDaData = async (body) => {
  const res = await fetch(DADATA_SUGGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${process.env.DADATA_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    // query не логируем — адреса относятся к чувствительным данным
    const error = new Error(`DaData HTTP ${res.status}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

const suggestAddresses = async ({ query, town }) => {
  if (!isDadataConfigured()) return { unavailable: true, suggestions: [] }
  const normalizedQuery = trimValue(query)
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return { unavailable: false, suggestions: [] }
  }
  const normalizedTown = trimValue(town)
  const cacheKey = `suggest|${normalizedQuery.toLowerCase()}|${normalizedTown.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const body = {
    query: normalizedQuery,
    count: SUGGEST_COUNT,
    language: 'ru',
    to_bound: { value: 'house' },
  }
  if (normalizedTown) body.locations_boost = [{ city: normalizedTown }]

  const json = await requestDaData(body)
  const payload = {
    unavailable: false,
    suggestions: (json?.suggestions ?? []).map(mapDadataSuggestion),
  }
  setCached(cacheKey, payload)
  return payload
}

// «Выбор подсказки» по контракту DaData: count=1, query = unrestricted_value
// предыдущего ответа — только так гарантированно заполняются geo_lat/geo_lon.
const selectAddress = async ({ query }) => {
  if (!isDadataConfigured()) return null
  const normalizedQuery = trimValue(query)
  if (!normalizedQuery) return null
  const cacheKey = `select|${normalizedQuery.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const json = await requestDaData({
    query: normalizedQuery,
    count: 1,
    language: 'ru',
  })
  const suggestion = json?.suggestions?.[0]
  const selected = suggestion ? mapDadataSuggestion(suggestion) : null
  if (selected) setCached(cacheKey, selected)
  return selected
}

export { isDadataConfigured, mapDadataSuggestion, selectAddress, suggestAddresses }
```

- [ ] **Step 4: Запустить проверочный скрипт — PASS**

Run: `node scripts/checkDadataMapping.mjs`
Expected: `checkDadataMapping: PASS`

- [ ] **Step 5: Lint + commit**

Run: `npx eslint server/dadataSuggest.mjs scripts/checkDadataMapping.mjs`
Expected: без ошибок.

```bash
git add server/dadataSuggest.mjs scripts/checkDadataMapping.mjs
git commit -m "feat: серверный модуль подсказок DaData с кэшем и маппингом адреса"
```

---

### Task 2: API endpoint `app/api/address/suggest/route.js`

**Files:**
- Create: `app/api/address/suggest/route.js`

**Interfaces:**
- Consumes: `isDadataConfigured`, `suggestAddresses`, `selectAddress` из `@server/dadataSuggest.mjs` (Task 1); `getTenantContext` из `@server/getTenantContext`.
- Produces: `POST /api/address/suggest`
  - body `{ query, town? }` → `{ success: true, data: { unavailable: boolean, suggestions: [...] } }`
  - body `{ mode: 'select', query }` → `{ success: true, data: { unavailable: false, selected: { label, address } | null } }`
  - 401 `{ success: false, error: 'Не авторизован' }`; 503 `{ success: false, error: 'Подсказки временно недоступны' }`

- [ ] **Step 1: Создать endpoint**

```js
import { NextResponse } from 'next/server'
import getTenantContext from '@server/getTenantContext'
import {
  isDadataConfigured,
  selectAddress,
  suggestAddresses,
} from '@server/dadataSuggest.mjs'

export const POST = async (req) => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  if (!isDadataConfigured()) {
    return NextResponse.json(
      { success: true, data: { unavailable: true, suggestions: [] } },
      { status: 200 }
    )
  }

  const body = await req.json().catch(() => ({}))

  try {
    if (body?.mode === 'select') {
      const selected = await selectAddress({ query: body?.query })
      return NextResponse.json(
        { success: true, data: { unavailable: false, selected } },
        { status: 200 }
      )
    }

    const data = await suggestAddresses({ query: body?.query, town: body?.town })
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    // query не логируем (чувствительные данные), только факт ошибки
    console.error('DaData suggest failed:', error?.status ?? error?.message)
    return NextResponse.json(
      { success: false, error: 'Подсказки временно недоступны' },
      { status: 503 }
    )
  }
}
```

- [ ] **Step 2: Lint + smoke-проверка без ключа**

Run: `npx eslint app/api/address/suggest/route.js` — без ошибок.

Run: `npm run dev`, затем в браузере (авторизованная сессия кабинета), в консоли:

```js
fetch('/api/address/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'ленинградская 12' }),
}).then((r) => r.json()).then(console.log)
```

Expected (без `DADATA_API_KEY` в `.env.local`): `{ success: true, data: { unavailable: true, suggestions: [] } }`.
Expected (с ключом): `data.suggestions` — массив объектов `{ label, address: { town, street, house, latitude, longitude } }`.
И та же проверка с `body: JSON.stringify({ mode: 'select', query: '<label из прошлого ответа>' })` → `data.selected.address.latitude/longitude` заполнены.
Dev-сервер после проверки остановить.

- [ ] **Step 3: Commit**

```bash
git add app/api/address/suggest/route.js
git commit -m "feat: endpoint /api/address/suggest (прокси DaData, tenant-aware)"
```

---

### Task 3: Компонент `components/AddressSuggestField.js`

**Files:**
- Create: `components/AddressSuggestField.js`

**Interfaces:**
- Consumes: `POST /api/address/suggest` (Task 2); `formatAddressPoolShort` из `@helpers/addressPool`; иконки `@fortawesome/free-solid-svg-icons/faPencilAlt`, `.../faTimes`.
- Produces (пропсы компонента — ими пользуется Task 4):

```
AddressSuggestField({
  address,              // объект адреса (может быть null)
  onChange,             // (addressObject | null) => void
  poolAddresses = [],   // массив адресов пула (siteSettings.addresses)
  defaultTown = '',     // город для locations_boost
  manualOpen = false,   // открыт ли сейчас ручной блок (управляет родитель)
  onManualInput,        // () => void — родитель переключает ручной блок
  error,                // строка ошибки поля (errors?.address)
  placeholder = 'Начните вводить адрес или выберите из своих',
})
```

Поведение:
- Режим `view` (чип), если `hasConcreteAddress(address)` = заполнено `street | house | flat | room | comment`. Иначе режим `search` (поле ввода). Синхронизация с внешним `address` через `useEffect` (важно для AI-черновика в `eventFunc`).
- Фокус на пустом поле → дропдаун «Мои адреса» (до 5 из пула). Пул пуст → строка-подсказка «Введите улицу и дом, например: Ленинградская 12».
- Ввод ≥ 4 символов → debounce 600 мс → suggest-запрос; матчи пула по подстроке показываются первой секцией.
- Выбор из пула → `onChange({ ...addr })`, режим `view`.
- Выбор подсказки → `mode: 'select'` запрос (координаты) → `onChange({ ...address, ...selected.address })`; при ошибке select — fallback на `suggestion.address` без координат.
- Клавиатура: ArrowUp/ArrowDown по плоскому списку опций, Enter — выбор, Escape — закрыть дропдаун.
- Внизу дропдауна всегда пункт «Ввести вручную» → `onManualInput()`.
- Чип: текст `formatAddressPoolShort(address)` + карандаш (вернуться в search) + крестик (`onChange(null)`). Под чипом кнопка «Дополнить адрес» / «Свернуть» → `onManualInput()`.

- [ ] **Step 1: Создать компонент**

```jsx
'use client'

import cn from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes'
import { formatAddressPoolShort } from '@helpers/addressPool'

const MIN_QUERY_LENGTH = 4
const DEBOUNCE_MS = 600
const MAX_POOL_ITEMS = 5
const CLIENT_CACHE_MAX = 50

const hasConcreteAddress = (address) =>
  Boolean(
    address?.street ||
      address?.house ||
      address?.flat ||
      address?.room ||
      address?.comment
  )

const AddressSuggestField = ({
  address,
  onChange,
  poolAddresses = [],
  defaultTown = '',
  manualOpen = false,
  onManualInput,
  error,
  placeholder = 'Начните вводить адрес или выберите из своих',
}) => {
  const [mode, setMode] = useState(() =>
    hasConcreteAddress(address) ? 'view' : 'search'
  )
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestFailed, setSuggestFailed] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const unavailableRef = useRef(false)
  const inputRef = useRef(null)

  const formattedAddress = useMemo(
    () => formatAddressPoolShort(address),
    [address]
  )

  // Синхронизация режима с внешним address (AI-черновик, загрузка события)
  useEffect(() => {
    setMode(hasConcreteAddress(address) ? 'view' : 'search')
  }, [address])

  const poolMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery
      ? poolAddresses.filter((addr) =>
          formatAddressPoolShort(addr).toLowerCase().includes(normalizedQuery)
        )
      : poolAddresses
    return filtered.slice(0, MAX_POOL_ITEMS)
  }, [poolAddresses, query])

  // Плоский список опций дропдауна для клавиатурной навигации
  const options = useMemo(() => {
    const list = [
      ...poolMatches.map((addr) => ({ type: 'pool', payload: addr })),
      ...suggestions.map((suggestion) => ({
        type: 'suggest',
        payload: suggestion,
      })),
    ]
    list.push({ type: 'manual' })
    return list
  }, [poolMatches, suggestions])

  const setClientCache = (key, value) => {
    if (cacheRef.current.size >= CLIENT_CACHE_MAX) cacheRef.current.clear()
    cacheRef.current.set(key, value)
  }

  // Best effort: при стирании символов используем кэш более длинного запроса
  const findPrefixCache = (normalizedQuery) => {
    let best = null
    for (const [key, value] of cacheRef.current.entries()) {
      if (
        key.startsWith(normalizedQuery) &&
        (!best || key.length > best.key.length)
      ) {
        best = { key, value }
      }
    }
    if (!best) return null
    const filtered = best.value.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(normalizedQuery)
    )
    return filtered.length > 0 ? filtered : null
  }

  const fetchSuggestions = async (value) => {
    const normalizedQuery = value.trim().toLowerCase()
    if (unavailableRef.current) return

    const exact = cacheRef.current.get(normalizedQuery)
    if (exact) {
      setSuggestions(exact)
      return
    }
    const prefixFiltered = findPrefixCache(normalizedQuery)
    if (prefixFiltered) {
      setSuggestions(prefixFiltered)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setSuggestFailed(false)
    try {
      const res = await fetch('/api/address/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value.trim(), town: defaultTown }),
        signal: controller.signal,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setSuggestFailed(true)
        setSuggestions([])
        return
      }
      const data = json.data ?? {}
      if (data.unavailable) {
        unavailableRef.current = true
        setSuggestions([])
        return
      }
      const next = data.suggestions ?? []
      setSuggestions(next)
      setClientCache(normalizedQuery, next)
    } catch (fetchError) {
      if (fetchError?.name !== 'AbortError') {
        setSuggestFailed(true)
        setSuggestions([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return undefined
    }
    debounceRef.current = setTimeout(
      () => fetchSuggestions(normalizedQuery),
      DEBOUNCE_MS
    )
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleSelectPool = (addr) => {
    onChange?.({ ...addr })
    setIsOpen(false)
    setQuery('')
  }

  const handleSelectSuggestion = async (suggestion) => {
    setIsOpen(false)
    setQuery('')
    // Уточняющий запрос ради координат; при ошибке — адрес из подсказки
    try {
      const res = await fetch('/api/address/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'select', query: suggestion.label }),
      })
      const json = await res.json().catch(() => null)
      const selected = json?.success ? json?.data?.selected : null
      onChange?.({ ...address, ...(selected?.address ?? suggestion.address) })
    } catch {
      onChange?.({ ...address, ...suggestion.address })
    }
  }

  const handleSelectOption = (option) => {
    if (option.type === 'pool') handleSelectPool(option.payload)
    else if (option.type === 'suggest') handleSelectSuggestion(option.payload)
    else {
      setIsOpen(false)
      onManualInput?.()
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (!isOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleSelectOption(options[activeIndex])
    }
  }

  const optionClassName = (index) =>
    cn(
      'flex min-h-[48px] w-full cursor-pointer items-center px-3 text-left text-sm hover:bg-blue-50',
      index === activeIndex && 'bg-blue-50'
    )

  if (mode === 'view') {
    return (
      <div className="mt-2.5 flex flex-col gap-y-1">
        <div className="flex min-h-[48px] items-center gap-x-2 rounded border border-gray-300 bg-white px-3">
          <span className="min-w-0 flex-1 truncate text-sm">
            {formattedAddress}
          </span>
          <button
            type="button"
            title="Изменить адрес"
            className="cursor-pointer p-2 text-gray-500 hover:text-general"
            onClick={() => {
              setQuery('')
              setMode('search')
            }}
          >
            <FontAwesomeIcon icon={faPencilAlt} className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Очистить адрес"
            className="cursor-pointer p-2 text-gray-500 hover:text-red-500"
            onClick={() => onChange?.(null)}
          >
            <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
          </button>
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
        <button
          type="button"
          className="cursor-pointer self-start text-sm text-general hover:underline"
          onClick={() => onManualInput?.()}
        >
          {manualOpen ? 'Свернуть детали адреса' : 'Дополнить адрес'}
        </button>
      </div>
    )
  }

  let optionIndex = -1

  return (
    <div className="relative mt-2.5">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        className={cn(
          'h-[48px] w-full rounded border bg-white px-3 text-sm outline-none',
          error ? 'border-red-400' : 'border-gray-300 focus:border-general'
        )}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(-1)
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
          {poolMatches.length > 0 && (
            <div className="px-3 pt-2 text-xs font-semibold text-gray-400">
              Мои адреса
            </div>
          )}
          {poolMatches.map((addr) => {
            optionIndex += 1
            const index = optionIndex
            return (
              <button
                key={`pool-${formatAddressPoolShort(addr)}`}
                type="button"
                className={optionClassName(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectPool(addr)
                }}
              >
                {formatAddressPoolShort(addr)}
              </button>
            )
          })}
          {query.trim().length >= MIN_QUERY_LENGTH && (
            <>
              {loading && (
                <div className="px-3 py-3 text-sm text-gray-400">Поиск…</div>
              )}
              {!loading && suggestFailed && (
                <div className="px-3 py-3 text-sm text-gray-500">
                  Подсказки временно недоступны
                </div>
              )}
              {!loading &&
                !suggestFailed &&
                suggestions.map((suggestion) => {
                  optionIndex += 1
                  const index = optionIndex
                  return (
                    <button
                      key={`suggest-${suggestion.label}`}
                      type="button"
                      className={optionClassName(index)}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        handleSelectSuggestion(suggestion)
                      }}
                    >
                      {suggestion.label}
                    </button>
                  )
                })}
              {!loading &&
                !suggestFailed &&
                suggestions.length === 0 &&
                !unavailableRef.current && (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    Ничего не найдено
                  </div>
                )}
            </>
          )}
          {query.trim().length < MIN_QUERY_LENGTH &&
            poolMatches.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">
                Введите улицу и дом, например: Ленинградская 12
              </div>
            )}
          {(() => {
            optionIndex += 1
            const index = optionIndex
            return (
              <button
                type="button"
                className={cn(
                  optionClassName(index),
                  'border-t border-gray-100 text-general'
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setIsOpen(false)
                  onManualInput?.()
                }}
              >
                Ввести вручную
              </button>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default AddressSuggestField
```

- [ ] **Step 2: Lint**

Run: `npx eslint components/AddressSuggestField.js`
Expected: без ошибок. Если eslint ругается на `react-hooks/exhaustive-deps` в других `useEffect` — добавить аналогичный `eslint-disable-next-line` с комментарием.

- [ ] **Step 3: Commit**

```bash
git add components/AddressSuggestField.js
git commit -m "feat: компонент AddressSuggestField — поиск адреса с подсказками и пулом"
```

---

### Task 4: Интеграция в `components/AddressPoolPicker.js`

**Files:**
- Modify: `components/AddressPoolPicker.js` (заменить блок `ComboBox` + кнопку-карандаш на `AddressSuggestField`; ручной блок и «Сохранить в пул» сохранить)

**Interfaces:**
- Consumes: `AddressSuggestField` из Task 3 (пропсы см. выше).
- Produces: интерфейс `AddressPoolPicker` наружу НЕ меняется — `layouts/modals/modalsFunc/eventFunc.js` не трогаем.

- [ ] **Step 1: Заменить контрол выбора адреса**

В `components/AddressPoolPicker.js`:

1. Удалить импорты `ComboBox` и `faPencilAlt`; добавить `import AddressSuggestField from './AddressSuggestField'`. Импорт `IconActionButton` удалить (кнопка-карандаш больше не нужна).
2. Удалить `poolOptions`, `currentValue`, `resolvedComboBoxPlaceholder`, `handleSelectFromPool` (больше не используются). `formattedAddress`, `isAddressInPool`, `canSaveToPool`, `handleSaveToPool` — оставить.
3. В JSX заменить блок (строки ~131–159 текущего файла — контейнер `grid grid-cols-[minmax(0,1fr)_auto]`, внутри `<div className="relative mt-2.5 ...">` с `<ComboBox` и кнопка `<IconActionButton`):

```jsx
<AddressSuggestField
  address={address}
  onChange={onChange}
  poolAddresses={poolAddresses}
  defaultTown={siteSettings?.defaultTown ?? ''}
  manualOpen={showManualInput}
  onManualInput={() => setShowManualInput((value) => !value)}
  error={errors?.address}
/>
```

4. Пропсы `comboBoxLabel`, `emptyComboBoxPlaceholder`, `manualToggleTitles` удалить из сигнатуры (мёртвый код; единственный вызов — `eventFunc.js` — их не передаёт; проверить `grep -r "AddressPoolPicker" layouts components app`, что других вызовов нет).
5. Блок `{showManualInput && (<AddressPicker .../> + «Сохранить в пул»)}` — оставить без изменений.

- [ ] **Step 2: Lint**

Run: `npx eslint components/AddressPoolPicker.js`
Expected: без ошибок.

- [ ] **Step 3: Ручные сценарии в браузере**

Run: `npm run dev`. Проверить в форме создания мероприятия (кабинет → события → создать), включая узкий экран (DevTools → device toolbar, ~375 px):

1. Новый пользователь (пул пуст): видно текстовое поле с плейсхолдером, НЕ селект. Фокус → подсказка «Введите улицу и дом…».
2. Пул заполнен: фокус на пустом поле → секция «Мои адреса» до 5 штук; тап по адресу → чип с адресом.
3. Ввод «ленинградская 12» → через ~0.6 с подсказки DaData (с ключом). Повторный ввод той же строки — без нового сетевого запроса (вкладка Network).
4. Выбор подсказки → чип; сохранить событие → в БД/API у события `address.town/street/house` заполнены, `latitude/longitude` заполнены. В карточке события навигаторные ссылки 2ГИС/Яндекс работают.
5. «Дополнить адрес» под чипом → ручная форма с уже заполненными городом/улицей/домом; подъезд/квартира дописываются, адрес не затирается.
6. «Ввести вручную» в дропдауне → ручная форма; «Сохранить в пул» работает как раньше.
7. Без `DADATA_API_KEY` (убрать из `.env.local`, перезапустить): подсказок нет, ошибок нет, пул + ручной ввод работают.
8. Крестик на чипе очищает адрес; карандаш возвращает в поиск.
9. Существующее событие с адресом открывается чипом; событие без адреса — полем поиска (город по умолчанию не мешает).

Dev-сервер после проверки остановить.

- [ ] **Step 4: Commit**

```bash
git add components/AddressPoolPicker.js
git commit -m "feat: умное поле локации в форме события (DaData + пул + ручной ввод)"
```

---

### Task 5: Документация, roadmap, версия

**Files:**
- Modify: `AGENTS.md` (раздел «Переменные окружения»)
- Modify: `docs/ROADMAP.md` (если найдётся пункт про поле адреса/локацию)
- Modify: `package.json` (версия — только если закрыт пункт roadmap)

- [ ] **Step 1: Задокументировать env**

В `AGENTS.md`, раздел «Переменные окружения (минимум)», добавить строку:

```
- Дополнительно для подсказок адресов: `DADATA_API_KEY`
```

- [ ] **Step 2: Проверить ROADMAP**

Run: поиск по `docs/ROADMAP.md` слов «адрес», «локац», «DaData». Если пункт про улучшение ввода адреса есть — отметить `[x]` и добавить запись в «Журнал изменений плана». Если закрыт пункт roadmap — bump patch в `package.json` (например `X.Y.Z -> X.Y.(Z+1)`). Если подходящего пункта нет — версию не трогаем, в журнал добавляем запись о проделанной работе без закрытия чекбокса.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md docs/ROADMAP.md package.json
git commit -m "docs: DADATA_API_KEY в env, журнал roadmap по полю адреса"
```
