# Дизайн: группировка входящих уведомлений мессенджеров

Дата: 2026-09-04
Статус: утверждено пользователем (выбор поведения — гибрид «C»)

## Проблема

Каждое входящее сообщение из Telegram/VK/Avito порождает отдельное системное push-уведомление (Web/PWA и Android): `tag` уникален для каждого сообщения (`incoming-message-<provider>-<messageId>`), плюс `requireInteraction: true`. При живом диалоге с клиентом пользователь получает поток всплывающих уведомлений, которые не складываются и не заменяют друг друга.

## Цель

Во время диалога — не более одного уведомления на чат, обновляемого по месту; без потери информации (виден счётчик непрочитанных и текст последнего сообщения); без задержки первого сообщения; без всплывашек, когда пользователь уже смотрит в открытый диалог.

## Решение (гибрид)

### 1. Payload и тег уведомления — `helpers/incomingMessageNotification.js`

- `tag` меняется на стабильный ключ диалога: `incoming-message-<provider>-<conversationKey>`, где `conversationKey` — `clientId`, а если клиент ещё не привязан — id чата (`conversationId`). Одинаковый tag заставляет браузер заменять прежнее уведомление вместо создания нового.
- В `body` добавляется счётчик из реального `unreadCount` чата (после инкремента webhook'ом): «Иван · 3 новых сообщения · последнее: …».
- Новые поля payload:
  - `renotify: false` — без повторного звука при замене;
  - `silent: true` — для повторных обновлений в серии;
  - `requireInteraction: true` — только у первого уведомления серии (когда до этого чат был прочитан).
- В `data` добавляются `conversationKey` и `unreadCount` (нужны для подавления и будущих действий).
- Тип `telephony_recording` (записи звонков) не меняется — там потока сообщений нет.

### 2. Серверное окно «живого диалога» — `server/messengerPush.js`

- На документах чатов (`telegramConversations`, `vkConversations`, `avitoConversations`) добавляется поле `lastPushAt` (Date, tenant-scoped через существующие фильтры).
- Правила отправки:
  - Web push — отправляем всегда (замена по tag бесшумна и дешевая).
  - Expo/Android — не чаще 1 раза в 2 минуты на чат (`lastPushAt` старше 2 минут → отправка и обновление поля), т.к. Android/Expo не умеют заменять уведомления по tag.
- После прочтения чата (`markRead`, `unreadCount: 0`) окно сбрасывается: `lastPushAt` очищается, следующее сообщение снова придёт как «первое» (со звуком и `requireInteraction`).
- Ключ окна — чат, а не tenant: параллельные диалоги с разными клиентами не влияют друг на друга.

### 3. Подавление, когда диалог открыт (Web/PWA)

- `layouts/modals/modalsFunc/clientMessengerFunc.js` при открытом диалоге шлёт service worker'у `navigator.serviceWorker.controller.postMessage({ type: 'messenger:active', conversationKey })`, heartbeat раз в 15 секунд; при закрытии диалога — `{ type: 'messenger:inactive', conversationKey }`.
- SW (`server/serviceWorkerScript.js`) держит в памяти карту `conversationKey → timestamp`. В `push`-обработчике для `data.type === 'incoming_messenger_message'`: если по этому чату heartbeat свежее 45 секунд — уведомление не показывается.
- Если SW старый и не понимает сообщение — подавления нет, поведение как сейчас (обратная совместимость).
- На Android отдельное подавление не делаем: там действует throttle из п. 2.

### 4. Тесты

- Расширить `helpers/incomingMessageNotification.test.js`: новый tag, счётчик непрочитанных в body, флаги `renotify/silent/requireInteraction` для первого/повторного уведомления.
- Юнит-тесты throttle-решения (первое сообщение, повтор в окне, повтор после окна, сброс после прочтения) — чистая функция рядом с `messengerPush.js`.
- Чистая функция подавления для SW (`shouldSuppressIncomingMessagePush(payload, activeConversations, now)`) с юнит-тестами; SW-скрипт использует её логику.

## Что сознательно не входит (YAGNI)

- Серверный буфер/дайджест с задержкой — первое сообщение должно приходить мгновенно.
- Изменение notification channel на Android (`channelId` остаётся `default`).
- Подавление push при открытом чате в мобильном приложении — отдельный трек.
- Изменения типа `telephony_recording`.

## Затронутые файлы

- `helpers/incomingMessageNotification.js` + `helpers/incomingMessageNotification.test.js`
- `server/messengerPush.js` (+ новый модуль throttle/подавления с тестами)
- `schemas/telegramConversationsSchema.js`, `schemas/vkConversationsSchema.js`, `schemas/avitoConversationsSchema.js` (поле `lastPushAt`)
- `server/serviceWorkerScript.js` (подавление при активном диалоге)
- `layouts/modals/modalsFunc/clientMessengerFunc.js` (heartbeat активного диалога)
- `docs/ROADMAP.md` (новый пункт Integrations UX Track + запись в журнал)
- `package.json` (patch bump версии)

## Риски и обратная совместимость

- Старые SW без обработчика `message` просто игнорируют heartbeat — деградация до текущего поведения.
- `lastPushAt` необязательное поле — существующие документы валидны без миграции.
- API-контракты webhook'ов не меняются.
- Mobile-first: в модалке диалога heartbeat реализуется в существующем жизненном цикле компонента, без новых сетевых запросов (только `postMessage` в SW).
