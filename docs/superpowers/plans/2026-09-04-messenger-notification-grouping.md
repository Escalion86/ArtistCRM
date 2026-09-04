# План реализации: группировка входящих уведомлений мессенджеров

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Группировать входящие push-уведомления Telegram/VK/Avito по диалогу: одно обновляемое уведомление на чат вместо потока всплывашек, throttle для Android и подавление, когда диалог открыт в кабинете.

**Architecture:** Стабильный `tag` уведомления на диалог (`conversationKey = clientId || conversationId`) заставляет браузер заменять прежнее уведомление. Серверный throttle (`lastPushAt` на документе чата) ограничивает Expo/Android push одним разом в 2 минуты на чат. Service worker подавляет показ уведомления, если модалка мессенджера шлёт heartbeat по этому `conversationKey`.

**Tech Stack:** Next.js App Router, Mongoose, Web Push (custom service worker), Expo Push, node:test.

**Спека:** `docs/superpowers/specs/2026-09-04-messenger-notification-grouping-design.md`

## Global Constraints

- Язык ответов и коммитов — русский (коммиты в существующем стиле репозитория).
- Тесты запускаются через `node --test <file>` (runner — `node:test`, см. существующий `helpers/incomingMessageNotification.test.js`).
- Проверка изменённых файлов: `npx eslint <file1> <file2> ...` (полный `npm run lint` нестабилен — не использовать).
- Все запросы к БД — tenant-aware (`tenantId` в фильтрах).
- Тип `notificationKind === 'recording'` (записи звонков) НЕ меняется: tag остаётся по `messageId`, `requireInteraction: true`.
- Пользовательские тексты уведомлений — на русском, с правильной плюрализацией.
- Версия приложения в `package.json`: patch bump `1.15.2 -> 1.15.3` в последней задаче.
- Минимальные точечные изменения, без лишних рефакторингов.

---

### Task 1: Payload — стабильный tag на диалог, счётчик непрочитанных, флаги звука

**Files:**
- Modify: `helpers/incomingMessageNotification.js`
- Test: `helpers/incomingMessageNotification.test.js`

**Interfaces:**
- Consumes: существующий `buildIncomingMessagePushPayload({ provider, messageId, messageText, clientId, clientName, event, notificationKind })`.
- Produces: расширенная сигнатура `buildIncomingMessagePushPayload({ ..., conversationId, unreadCount })`. Новые поля результата: `renotify` (boolean), `silent` (boolean), `data.conversationKey` (string), `data.unreadCount` (number). `tag` для сообщений: `incoming-message-<provider>-<conversationKey>`. Новый экспорт `formatUnreadCount(count)`.

- [ ] **Step 1: Добавить падающие тесты**

В `helpers/incomingMessageNotification.test.js` добавить (существующие 2 теста не трогать):

```js
test('uses a stable per-conversation tag and marks repeated updates as silent', () => {
  const first = buildIncomingMessagePushPayload({
    provider: 'telegram',
    messageId: 'message-1',
    messageText: 'Привет',
    clientId: 'client-1',
    clientName: 'Анна Иванова',
    conversationId: 'conversation-1',
    unreadCount: 1,
  })
  const second = buildIncomingMessagePushPayload({
    provider: 'telegram',
    messageId: 'message-2',
    messageText: 'Вы на месте?',
    clientId: 'client-1',
    clientName: 'Анна Иванова',
    conversationId: 'conversation-1',
    unreadCount: 2,
  })

  assert.equal(first.tag, 'incoming-message-telegram-client-1')
  assert.equal(second.tag, 'incoming-message-telegram-client-1')
  assert.equal(first.requireInteraction, true)
  assert.equal(first.silent, false)
  assert.equal(first.renotify, false)
  assert.equal(second.requireInteraction, false)
  assert.equal(second.silent, true)
  assert.match(second.body, /2 новых сообщения/)
  assert.equal(second.data.conversationKey, 'client-1')
  assert.equal(second.data.unreadCount, 2)
})

test('falls back to conversation id when client is not linked yet', () => {
  const payload = buildIncomingMessagePushPayload({
    provider: 'vk',
    messageId: 'message-3',
    messageText: 'Здравствуйте',
    clientName: 'Гость VK',
    conversationId: 'conversation-9',
    unreadCount: 3,
  })

  assert.equal(payload.tag, 'incoming-message-vk-conversation-9')
  assert.equal(payload.data.conversationKey, 'conversation-9')
  assert.match(payload.body, /3 новых сообщения/)
})

test('keeps call recording notifications unchanged', () => {
  const payload = buildIncomingMessagePushPayload({
    provider: 'novofon',
    messageId: 'call-1',
    clientName: 'Анна Иванова',
    notificationKind: 'recording',
    conversationId: 'conversation-1',
    unreadCount: 5,
  })

  assert.equal(payload.tag, 'call-recording-novofon-call-1')
  assert.equal(payload.requireInteraction, true)
  assert.equal(payload.silent, false)
  assert.doesNotMatch(payload.body, /новых сообщ/)
})

test('pluralizes unread counter in Russian', () => {
  assert.equal(formatUnreadCount(1), '')
  assert.equal(formatUnreadCount(2), '2 новых сообщения')
  assert.equal(formatUnreadCount(5), '5 новых сообщений')
  assert.equal(formatUnreadCount(21), '21 новое сообщение')
  assert.equal(formatUnreadCount(11), '11 новых сообщений')
})
```

Импорт в начале теста заменить на:

```js
import {
  buildIncomingMessagePushPayload,
  formatUnreadCount,
} from './incomingMessageNotification.js'
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `node --test helpers/incomingMessageNotification.test.js`
Expected: FAIL — `formatUnreadCount is not a function` / неверный tag.

- [ ] **Step 3: Реализовать изменения в `helpers/incomingMessageNotification.js`**

Заменить функцию `buildIncomingMessagePushPayload` и добавить плюрализацию (остальной файл без изменений):

```js
const pluralizeMessages = (count) => {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'сообщений'
  if (mod10 === 1) return 'сообщение'
  if (mod10 >= 2 && mod10 <= 4) return 'сообщения'
  return 'сообщений'
}

export const formatUnreadCount = (count) => {
  const value = Number(count)
  if (!Number.isFinite(value) || value <= 1) return ''
  const rounded = Math.floor(value)
  return `${rounded} новых ${pluralizeMessages(rounded)}`
}

export const buildIncomingMessagePushPayload = ({
  provider,
  messageId,
  messageText,
  clientId,
  clientName,
  event,
  notificationKind = 'message',
  conversationId,
  unreadCount = 0,
}) => {
  const providerLabel = PROVIDER_LABELS[provider] || normalizeText(provider, 'CRM')
  const safeClientName = normalizeText(clientName, 'Клиент')
  const eventId = String(event?._id || '')
  const eventTitle = normalizeText(event?.eventType, 'Мероприятие')
  const eventDate = formatEventDate(event?.eventDate)
  const isRecording = notificationKind === 'recording'
  const safeUnreadCount = Number.isFinite(Number(unreadCount))
    ? Math.max(0, Math.floor(Number(unreadCount)))
    : 0
  const isFirstInSeries = safeUnreadCount <= 1

  const bodyParts = [safeClientName]
  const unreadPart = isRecording ? '' : formatUnreadCount(safeUnreadCount)
  if (unreadPart) bodyParts.push(unreadPart)
  if (messageText) bodyParts.push(truncateText(messageText))
  if (eventId) {
    bodyParts.push(
      `Ближайшее: ${eventTitle}${eventDate ? `, ${eventDate}` : ''}`
    )
  }

  const conversationKey = String(
    clientId || conversationId || messageId || Date.now()
  )

  return {
    title: isRecording
      ? `Получена запись звонка · ${safeClientName}`
      : `Новое сообщение · ${providerLabel}`,
    body: bodyParts.join(' • '),
    icon: '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: '/icons/notification-badge.svg',
    tag: isRecording
      ? `call-recording-${provider}-${messageId || Date.now()}`
      : `incoming-message-${provider}-${conversationKey}`,
    renotify: false,
    silent: isRecording ? false : !isFirstInSeries,
    requireInteraction: isRecording ? true : isFirstInSeries,
    data: {
      url: eventId
        ? `/cabinet/eventsUpcoming?openEvent=${eventId}`
        : '/cabinet/clients',
      clientId: String(clientId || ''),
      eventId,
      provider,
      conversationKey,
      unreadCount: safeUnreadCount,
      type: isRecording ? 'telephony_recording' : 'incoming_messenger_message',
    },
  }
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `node --test helpers/incomingMessageNotification.test.js`
Expected: PASS, 6 тестов (2 старых + 4 новых).

- [ ] **Step 5: Lint и коммит**

```bash
npx eslint helpers/incomingMessageNotification.js helpers/incomingMessageNotification.test.js
git add helpers/incomingMessageNotification.js helpers/incomingMessageNotification.test.js
git commit -m "feat: стабильный tag и счётчик непрочитанных в push о входящих сообщениях"
```

---

### Task 2: Чистая функция throttle для Expo/Android

**Files:**
- Create: `server/messengerPushThrottle.js`
- Test: `server/messengerPushThrottle.test.js`

**Interfaces:**
- Produces: `MESSENGER_EXPO_PUSH_WINDOW_MS` (number, 120000), `shouldSendExpoPushForConversation({ lastPushAt, now, windowMs }) -> boolean`. Используется в Task 4.

- [ ] **Step 1: Написать падающий тест `server/messengerPushThrottle.test.js`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MESSENGER_EXPO_PUSH_WINDOW_MS,
  shouldSendExpoPushForConversation,
} from './messengerPushThrottle.js'

test('sends expo push when conversation was never notified', () => {
  assert.equal(shouldSendExpoPushForConversation({ lastPushAt: null }), true)
  assert.equal(shouldSendExpoPushForConversation({}), true)
})

test('suppresses expo push inside the throttle window', () => {
  const now = Date.now()
  const lastPushAt = new Date(now - 30 * 1000)
  assert.equal(
    shouldSendExpoPushForConversation({ lastPushAt, now }),
    false
  )
})

test('sends expo push again after the window passed', () => {
  const now = Date.now()
  const lastPushAt = new Date(now - MESSENGER_EXPO_PUSH_WINDOW_MS - 1000)
  assert.equal(
    shouldSendExpoPushForConversation({ lastPushAt, now }),
    true
  )
})

test('treats invalid lastPushAt as never notified', () => {
  assert.equal(
    shouldSendExpoPushForConversation({ lastPushAt: 'not-a-date' }),
    true
  )
})
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test server/messengerPushThrottle.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `server/messengerPushThrottle.js`**

```js
export const MESSENGER_EXPO_PUSH_WINDOW_MS = 2 * 60 * 1000

export const shouldSendExpoPushForConversation = ({
  lastPushAt,
  now = Date.now(),
  windowMs = MESSENGER_EXPO_PUSH_WINDOW_MS,
} = {}) => {
  if (!lastPushAt) return true
  const timestamp = new Date(lastPushAt).getTime()
  if (Number.isNaN(timestamp)) return true
  return now - timestamp >= windowMs
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test server/messengerPushThrottle.test.js`
Expected: PASS, 4 теста.

- [ ] **Step 5: Lint и коммит**

```bash
npx eslint server/messengerPushThrottle.js server/messengerPushThrottle.test.js
git add server/messengerPushThrottle.js server/messengerPushThrottle.test.js
git commit -m "feat: throttle expo push по входящим сообщениям на чат"
```

---

### Task 3: Чистая функция подавления для service worker

**Files:**
- Create: `server/swPushSuppression.js`
- Test: `server/swPushSuppression.test.js`

**Interfaces:**
- Produces: `shouldSuppressIncomingMessagePush(payload, activeConversations, now, ttlMs = 45000) -> boolean`. Функция в Task 6 инжектируется в SW через `.toString()`, поэтому не должна ссылаться на внешние константы/импорты (default-параметр — литерал). Также экспортируется константа `ACTIVE_CONVERSATION_TTL_MS` (45000) для тестов.

- [ ] **Step 1: Написать падающий тест `server/swPushSuppression.test.js`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ACTIVE_CONVERSATION_TTL_MS,
  shouldSuppressIncomingMessagePush,
} from './swPushSuppression.js'

const buildPayload = (conversationKey = 'client-1') => ({
  data: {
    type: 'incoming_messenger_message',
    conversationKey,
  },
})

test('suppresses push for a conversation with a fresh heartbeat', () => {
  const now = Date.now()
  const active = { 'client-1': now - 10 * 1000 }
  assert.equal(
    shouldSuppressIncomingMessagePush(buildPayload(), active, now),
    true
  )
})

test('does not suppress push of another type', () => {
  const now = Date.now()
  const payload = buildPayload()
  payload.data.type = 'telephony_recording'
  assert.equal(
    shouldSuppressIncomingMessagePush(payload, { 'client-1': now }, now),
    false
  )
})

test('does not suppress when heartbeat is stale', () => {
  const now = Date.now()
  const active = { 'client-1': now - ACTIVE_CONVERSATION_TTL_MS - 1000 }
  assert.equal(
    shouldSuppressIncomingMessagePush(buildPayload(), active, now),
    false
  )
})

test('does not suppress other conversations or missing key', () => {
  const now = Date.now()
  const active = { 'client-2': now }
  assert.equal(
    shouldSuppressIncomingMessagePush(buildPayload(), active, now),
    false
  )
  assert.equal(
    shouldSuppressIncomingMessagePush({ data: { type: 'incoming_messenger_message' } }, active, now),
    false
  )
  assert.equal(shouldSuppressIncomingMessagePush(buildPayload(), {}, now), false)
})
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test server/swPushSuppression.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `server/swPushSuppression.js`**

```js
export const ACTIVE_CONVERSATION_TTL_MS = 45 * 1000

// ВАЖНО: функция инжектируется в service worker через .toString()
// (см. server/serviceWorkerScript.js), поэтому она должна быть
// самодостаточной: без импортов и ссылок на внешние константы.
// TTL продублирован литералом в default-параметре осознанно.
export const shouldSuppressIncomingMessagePush = (
  payload,
  activeConversations,
  now,
  ttlMs = 45 * 1000
) => {
  if (payload?.data?.type !== 'incoming_messenger_message') return false
  const key = String(payload?.data?.conversationKey || '')
  if (!key) return false
  const timestamp = activeConversations?.[key]
  if (!timestamp) return false
  return now - timestamp <= ttlMs
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test server/swPushSuppression.test.js`
Expected: PASS, 4 теста.

- [ ] **Step 5: Lint и коммит**

```bash
npx eslint server/swPushSuppression.js server/swPushSuppression.test.js
git add server/swPushSuppression.js server/swPushSuppression.test.js
git commit -m "feat: чистая функция подавления push при открытом диалоге"
```

---

### Task 4: Интеграция в `server/messengerPush.js` + поле `lastPushAt` + точки вызова

**Files:**
- Modify: `server/messengerPush.js`
- Modify: `schemas/telegramConversationsSchema.js`
- Modify: `schemas/vkConversationsSchema.js`
- Modify: `schemas/avitoConversationsSchema.js`
- Modify: `app/api/integrations/telegram/webhook/[token]/route.js` (вызов `notifyIncomingClientMessage`, строки 98-105)
- Modify: `server/avito.js` (функция `notifyAvitoMessage`, строки 446-454)
- Modify: `server/vkGroup.js` (функция `notifyVkMessage`, строки 570-578)

**Interfaces:**
- Consumes: `buildIncomingMessagePushPayload` из Task 1 (новые параметры `conversationId`, `unreadCount`), `shouldSendExpoPushForConversation` из Task 2, `sendPushToTenant` из `@server/pushNotifications`, `sendExpoPushToTenant` из `@server/expoPushNotifications`, `aggregatePushResults` из `./pushResultAggregation.js`.
- Produces: `notifyIncomingClientMessage({ tenantId, provider, messageId, messageText, clientId, clientName, associatedEvent, associatedEventId, conversationId, unreadCount })` — сигнатура расширена, старые вызовы остаются валидными. Web push отправляется всегда; Expo push — только если `shouldSendExpoPushForConversation` вернул true, тогда `lastPushAt` обновляется.

- [ ] **Step 1: Добавить `lastPushAt` в три схемы чатов**

В `schemas/telegramConversationsSchema.js`, `schemas/vkConversationsSchema.js`, `schemas/avitoConversationsSchema.js` сразу после поля `unreadCount` добавить:

```js
  lastPushAt: {
    type: Date,
    default: null,
  },
```

- [ ] **Step 2: Переписать `server/messengerPush.js`**

Импорты в начале файла заменить на:

```js
import Clients from '@models/Clients'
import Events from '@models/Events'
import TelegramConversations from '@models/TelegramConversations'
import VkConversations from '@models/VkConversations'
import AvitoConversations from '@models/AvitoConversations'
import getPersonFullName from '@helpers/getPersonFullName'
import { buildIncomingMessagePushPayload } from '@helpers/incomingMessageNotification'
import { sendPushToTenant } from '@server/pushNotifications'
import { sendExpoPushToTenant } from '@server/expoPushNotifications'
import { aggregatePushResults } from './pushResultAggregation.js'
import { shouldSendExpoPushForConversation } from './messengerPushThrottle.js'

const CONVERSATION_MODELS = {
  telegram: TelegramConversations,
  vk: VkConversations,
  avito: AvitoConversations,
}
```

Функции `resolveNearestClientEvent`, `resolveClientName`, `resolveClientMessageContext` — без изменений. `notifyIncomingClientMessage` заменить на:

```js
export const notifyIncomingClientMessage = async ({
  tenantId,
  provider,
  messageId,
  messageText,
  clientId,
  clientName,
  associatedEvent,
  associatedEventId,
  conversationId,
  unreadCount = 0,
}) => {
  if (!tenantId || !provider) return null

  const context = await resolveClientMessageContext({
    tenantId,
    clientId,
    clientName,
    associatedEvent,
    associatedEventId,
  })
  const payload = buildIncomingMessagePushPayload({
    provider,
    messageId,
    messageText,
    clientId,
    clientName: context.clientName,
    event: context.event,
    conversationId,
    unreadCount,
  })

  const ConversationModel = CONVERSATION_MODELS[provider] || null
  let expoAllowed = true
  if (ConversationModel && conversationId) {
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      tenantId,
    })
      .select('lastPushAt')
      .lean()
    expoAllowed = shouldSendExpoPushForConversation({
      lastPushAt: conversation?.lastPushAt,
    })
    if (expoAllowed) {
      await ConversationModel.updateOne(
        { _id: conversationId, tenantId },
        { $set: { lastPushAt: new Date() } }
      )
    }
  }

  const [web, expo] = await Promise.all([
    sendPushToTenant({ tenantId, payload, source: `messenger_${provider}` }),
    expoAllowed
      ? sendExpoPushToTenant({ tenantId, payload })
      : Promise.resolve(null),
  ])
  return aggregatePushResults(web, expo)
}
```

Экспорт в конце файла оставить: `export { resolveClientMessageContext, resolveNearestClientEvent }`.

Примечание: `sendMultiChannelPushToTenant` из `@server/multiChannelPush` больше здесь не используется — сам модуль не трогаем, он нужен другим вызывающим (заявки, тикеты).

- [ ] **Step 3: Передать `conversationId`/`unreadCount` из трёх точек вызова**

`app/api/integrations/telegram/webhook/[token]/route.js` — в вызов `notifyIncomingClientMessage({...})` после `associatedEventId: result.conversation?.eventId,` добавить:

```js
        conversationId: result.conversation?._id,
        unreadCount: result.conversation?.unreadCount || 0,
```

`server/avito.js` — в `notifyAvitoMessage` после `clientName: conversation?.clientName || normalized.name,` добавить:

```js
    conversationId: conversation?._id,
    unreadCount: conversation?.unreadCount || 0,
```

`server/vkGroup.js` — в `notifyVkMessage` после `clientName: conversation?.clientName || normalized.name,` добавить:

```js
    conversationId: conversation?._id,
    unreadCount: conversation?.unreadCount || 0,
```

(Во всех трёх местах conversation-документ уже получен с `returnDocument: 'after'`, поэтому `unreadCount` актуален.)

- [ ] **Step 4: Прогнать смежные тесты и lint**

```bash
node --test helpers/incomingMessageNotification.test.js server/messengerPushThrottle.test.js
npx eslint server/messengerPush.js schemas/telegramConversationsSchema.js schemas/vkConversationsSchema.js schemas/avitoConversationsSchema.js "app/api/integrations/telegram/webhook/[token]/route.js" server/avito.js server/vkGroup.js
```

Expected: тесты PASS, eslint без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add server/messengerPush.js schemas/telegramConversationsSchema.js schemas/vkConversationsSchema.js schemas/avitoConversationsSchema.js "app/api/integrations/telegram/webhook/[token]/route.js" server/avito.js server/vkGroup.js
git commit -m "feat: группировка входящих push по диалогу и throttle expo-канала"
```

---

### Task 5: Сброс `lastPushAt` при прочтении чата

**Files:**
- Modify: `app/api/clients/[id]/messenger/route.js` (PATCH, строки 291-310)
- Modify: `app/api/integrations/vk/conversations/[id]/route.js` (строка ~63)
- Modify: `app/api/integrations/avito/conversations/[id]/route.js` (строка ~63)

**Interfaces:**
- Consumes: поле `lastPushAt` из Task 4. После прочтения следующий входящий push снова считается «первым в серии».

- [ ] **Step 1: Сброс в PATCH `/api/clients/[id]/messenger`**

В трёх `updateMany` заменить `{ $set: { unreadCount: 0 } }` на:

```js
          { $set: { unreadCount: 0, lastPushAt: null } }
```

(три замены: `AvitoConversations`, `VkConversations`, `TelegramConversations`).

- [ ] **Step 2: Сброс в markRead-роутах VK и Avito**

В `app/api/integrations/vk/conversations/[id]/route.js` и `app/api/integrations/avito/conversations/[id]/route.js` заменить:

```js
  if (body.markRead === true) update.unreadCount = 0
```

на:

```js
  if (body.markRead === true) {
    update.unreadCount = 0
    update.lastPushAt = null
  }
```

- [ ] **Step 3: Lint и коммит**

```bash
npx eslint "app/api/clients/[id]/messenger/route.js" "app/api/integrations/vk/conversations/[id]/route.js" "app/api/integrations/avito/conversations/[id]/route.js"
git add "app/api/clients/[id]/messenger/route.js" "app/api/integrations/vk/conversations/[id]/route.js" "app/api/integrations/avito/conversations/[id]/route.js"
git commit -m "feat: сброс throttle push при прочтении диалога"
```

---

### Task 6: Service worker — подавление при открытом диалоге, `silent`, bump версии SW

**Files:**
- Modify: `server/serviceWorkerScript.js`

**Interfaces:**
- Consumes: `shouldSuppressIncomingMessagePush` из Task 3 (инжектируется в шаблон через `.toString()`), новые поля payload `silent`/`data.conversationKey`/`data.type` из Task 1, heartbeat-сообщения `messenger:active`/`messenger:inactive` из Task 7.
- Produces: SW версии `artistcrm-custom-sw-v3`. Старые SW без обработчика heartbeat просто не подавляют уведомления (деградация до текущего поведения).

- [ ] **Step 1: Обновить `server/serviceWorkerScript.js`**

В начало файла добавить импорт:

```js
import { shouldSuppressIncomingMessagePush } from './swPushSuppression.js'
```

Версию поднять:

```js
const SERVICE_WORKER_VERSION = 'artistcrm-custom-sw-v3'
```

В шаблоне сразу после строки `const RUNTIME_CACHE = 'crm-runtime-v2'` вставить:

```js
const ACTIVE_CONVERSATIONS = {}
// Логика живёт в server/swPushSuppression.js (там же тесты);
// сюда функция инжектируется исходником, чтобы SW был самодостаточным.
const shouldSuppressIncomingMessagePush = ${shouldSuppressIncomingMessagePush.toString()}
```

Обработчик `message` (сейчас строки 26-30) заменить на:

```js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting())
  }
  if (event.data?.type === 'messenger:active' && event.data.conversationKey) {
    ACTIVE_CONVERSATIONS[String(event.data.conversationKey)] = Date.now()
  }
  if (event.data?.type === 'messenger:inactive' && event.data.conversationKey) {
    delete ACTIVE_CONVERSATIONS[String(event.data.conversationKey)]
  }
})
```

В `push`-обработчике (строки 178-205) после разбора `payload` и перед формированием `options` вставить подавление, а в `options` добавить `silent`:

```js
  if (
    shouldSuppressIncomingMessagePush(payload, ACTIVE_CONVERSATIONS, Date.now())
  ) {
    return
  }

  const title = payload?.title || 'Новое уведомление'
  const options = {
    body: payload?.body || '',
    icon:
      payload?.icon ||
      '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: payload?.badge || '/icons/notification-badge.svg',
    tag: payload?.tag || undefined,
    data: payload?.data || {},
    actions: Array.isArray(payload?.actions) ? payload.actions : [],
    renotify: Boolean(payload?.renotify),
    silent: Boolean(payload?.silent),
    requireInteraction: Boolean(payload?.requireInteraction),
  }
```

- [ ] **Step 2: Проверить, что сгенерированный SW валиден**

```bash
node -e "import('./server/serviceWorkerScript.js').then((m) => { new Function(m.SERVICE_WORKER_SCRIPT); console.log('SW script OK, version:', m.SERVICE_WORKER_VERSION) })"
```

Expected: `SW script OK, version: artistcrm-custom-sw-v3` (синтаксис сгенерированной строки валиден).

- [ ] **Step 3: Lint и коммит**

```bash
npx eslint server/serviceWorkerScript.js
git add server/serviceWorkerScript.js
git commit -m "feat: service worker подавляет push при открытом диалоге"
```

---

### Task 7: Heartbeat активного диалога из модалки мессенджера

**Files:**
- Modify: `layouts/modals/modalsFunc/clientMessengerFunc.js` (компонент `ClientMessengerModal`, после `useEffect(() => { load() }, [load])` — строки 284-286)

**Interfaces:**
- Produces: сообщения `{ type: 'messenger:active' | 'messenger:inactive', conversationKey }` в `navigator.serviceWorker.controller`; `conversationKey = String(clientId)` — совпадает с `data.conversationKey` из Task 1 (на сервере ключ = clientId, если клиент привязан).

- [ ] **Step 1: Добавить эффект heartbeat**

После существующего `useEffect(() => { load() }, [load])` добавить:

```js
    useEffect(() => {
      if (!clientId) return undefined
      const postToServiceWorker = (type) => {
        if (typeof navigator === 'undefined') return
        const controller = navigator.serviceWorker?.controller
        if (!controller) return
        controller.postMessage({
          type,
          conversationKey: String(clientId),
        })
      }
      postToServiceWorker('messenger:active')
      const intervalId = setInterval(
        () => postToServiceWorker('messenger:active'),
        15000
      )
      return () => {
        clearInterval(intervalId)
        postToServiceWorker('messenger:inactive')
      }
    }, [clientId])
```

- [ ] **Step 2: Lint и коммит**

```bash
npx eslint layouts/modals/modalsFunc/clientMessengerFunc.js
git add layouts/modals/modalsFunc/clientMessengerFunc.js
git commit -m "feat: heartbeat открытого диалога мессенджера в service worker"
```

---

### Task 8: Roadmap, версия, финальная проверка

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: все предыдущие задачи.

- [ ] **Step 1: Обновить `docs/ROADMAP.md`**

В разделе `### Integrations UX Track: API-ключи и уведомления` сразу после строки `- [x] INT-T5 Добавить push по новым сообщениям Telegram/VK/Avito ...` добавить:

```markdown
- [x] INT-T6 Группировать входящие push Telegram/VK/Avito по диалогу: стабильный tag на чат, счётчик непрочитанных, бесшумное обновление, throttle Expo/Android (раз в 2 мин на чат) и подавление при открытом диалоге в кабинете
```

В начало раздела `Журнал изменений плана` (перед записью `2026-08-25: закрыт INT-T5 ...`) добавить:

```markdown
- 2026-09-04: закрыт INT-T6 — входящие сообщения Telegram/VK/Avito группируются в одно обновляемое уведомление на диалог со счётчиком непрочитанных и бесшумными повторами; Expo/Android push ограничен одним разом в 2 минуты на чат со сбросом после прочтения; открытый диалог в кабинете подавляет системный push через heartbeat в service worker. Версия поднята до 1.15.3.
```

- [ ] **Step 2: Поднять версию в `package.json`**

`"version": "1.15.2"` → `"version": "1.15.3"`.

- [ ] **Step 3: Полный прогон затронутых тестов и lint всех изменённых файлов**

```bash
node --test helpers/incomingMessageNotification.test.js server/messengerPushThrottle.test.js server/swPushSuppression.test.js
npx eslint helpers/incomingMessageNotification.js helpers/incomingMessageNotification.test.js server/messengerPush.js server/messengerPushThrottle.js server/messengerPushThrottle.test.js server/swPushSuppression.js server/swPushSuppression.test.js server/serviceWorkerScript.js layouts/modals/modalsFunc/clientMessengerFunc.js server/avito.js server/vkGroup.js "app/api/integrations/telegram/webhook/[token]/route.js" "app/api/clients/[id]/messenger/route.js" "app/api/integrations/vk/conversations/[id]/route.js" "app/api/integrations/avito/conversations/[id]/route.js" schemas/telegramConversationsSchema.js schemas/vkConversationsSchema.js schemas/avitoConversationsSchema.js
```

Expected: 14 тестов PASS, eslint без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add docs/ROADMAP.md package.json
git commit -m "docs: закрыт INT-T6 (группировка push по диалогу), версия 1.15.3"
```
