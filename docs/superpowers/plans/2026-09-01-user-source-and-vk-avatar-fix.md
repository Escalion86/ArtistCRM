# User Source And VK Avatar Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Согласованно показывать UTM-источник пользователя и загружать VK-аватары в модальном окне через `next/image`.

**Architecture:** Вычисление источника централизуется в чистом helper с приоритетом `registrationSource` над `acquisition.source`, после чего helper используется всеми пользовательскими представлениями. Доступ к изображениям расширяется только для HTTPS-поддоменов `vkuserphoto.ru` через `remotePatterns` Next.js.

**Tech Stack:** Next.js App Router, React, Node.js test runner, ESLint.

---

### Task 1: Единое вычисление источника пользователя

**Files:**
- Modify: `helpers/registrationSource.test.mjs`
- Modify: `helpers/registrationSource.mjs`
- Modify: `layouts/cards/UserCard.js`
- Modify: `layouts/content/UsersContent.js`
- Modify: `layouts/modals/modalsFunc/userViewFunc.js`

- [ ] **Step 1: Write the failing tests**

Добавить импорт `getUserRegistrationSource` и тесты:

```js
test('getUserRegistrationSource prefers explicit registration source', () => {
  assert.equal(
    getUserRegistrationSource({
      registrationSource: 'focusnik-pilot',
      acquisition: { source: 'yandex' },
    }),
    'focusnik-pilot'
  )
})

test('getUserRegistrationSource falls back to acquisition source', () => {
  assert.equal(
    getUserRegistrationSource({
      registrationSource: '',
      acquisition: { source: 'Yandex' },
    }),
    'yandex'
  )
})

test('getUserRegistrationSource rejects missing or unsafe sources', () => {
  assert.equal(getUserRegistrationSource({}), '')
  assert.equal(
    getUserRegistrationSource({ acquisition: { source: '<script>' } }),
    ''
  )
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test helpers/registrationSource.test.mjs`

Expected: FAIL because `getUserRegistrationSource` is not exported.

- [ ] **Step 3: Implement the helper and use it consistently**

Добавить в `helpers/registrationSource.mjs`:

```js
export const getUserRegistrationSource = (user) =>
  normalizeRegistrationSource(user?.registrationSource) ||
  normalizeRegistrationSource(user?.acquisition?.source)
```

В `UserCard.js` и `userViewFunc.js` форматировать `getUserRegistrationSource(user)`. В `UsersContent.js` использовать `getUserRegistrationSource(user) || EMPTY_SOURCE` для статистики и фильтрации.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test helpers/registrationSource.test.mjs`

Expected: все тесты проходят.

### Task 2: Разрешённые домены VK-аватаров

**Files:**
- Create: `helpers/nextImageConfig.test.mjs`
- Modify: `next.config.js`

- [ ] **Step 1: Write the failing configuration test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')
const { hasRemoteMatch } = require('next/dist/shared/lib/match-remote-pattern')

test('Next image config allows VK avatars but rejects arbitrary hosts', () => {
  const domains = nextConfig.images?.domains ?? []
  const patterns = nextConfig.images?.remotePatterns ?? []

  assert.equal(
    hasRemoteMatch(
      domains,
      patterns,
      new URL('https://sun4-20.vkuserphoto.ru/avatar.jpg')
    ),
    true
  )
  assert.equal(
    hasRemoteMatch(
      domains,
      patterns,
      new URL('https://example.com/avatar.jpg')
    ),
    false
  )
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test helpers/nextImageConfig.test.mjs`

Expected: FAIL because `vkuserphoto.ru` does not match existing `remotePatterns`.

- [ ] **Step 3: Add the narrow VK remote pattern**

Добавить в `next.config.js`:

```js
{
  protocol: 'https',
  hostname: '**.vkuserphoto.ru',
  pathname: '/**',
},
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test helpers/nextImageConfig.test.mjs`

Expected: тест проходит.

### Task 3: Итоговая проверка

**Files:**
- Verify: `helpers/registrationSource.mjs`
- Verify: `helpers/registrationSource.test.mjs`
- Verify: `helpers/nextImageConfig.test.mjs`
- Verify: `layouts/cards/UserCard.js`
- Verify: `layouts/content/UsersContent.js`
- Verify: `layouts/modals/modalsFunc/userViewFunc.js`
- Verify: `next.config.js`

- [ ] **Step 1: Run focused tests**

Run: `node --test helpers/registrationSource.test.mjs helpers/nextImageConfig.test.mjs`

Expected: все тесты проходят без предупреждений.

- [ ] **Step 2: Run focused ESLint**

Run: `npx eslint helpers/registrationSource.mjs helpers/registrationSource.test.mjs helpers/nextImageConfig.test.mjs layouts/cards/UserCard.js layouts/content/UsersContent.js layouts/modals/modalsFunc/userViewFunc.js next.config.js`

Expected: ошибок ESLint нет.

- [ ] **Step 3: Check the patch**

Run: `git diff --check && git status --short`

Expected: whitespace-ошибок нет; изменены только перечисленные файлы и план.
