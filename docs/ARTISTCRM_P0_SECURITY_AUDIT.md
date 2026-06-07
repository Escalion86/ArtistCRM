# ArtistCRM P0 Security Audit

Дата: 2026-06-07.

Scope: focused P0-аудит перед официальным запуском. Проверены публичные API, webhook'и, cron endpoints, upload/log endpoints, платежные sync/webhook endpoints и destructive dev endpoints. Это не exhaustive Codex Security Scan по всему репозиторию.

## Исправлено сразу

### 1. `/api/cloud` был публичным upload-прокси

Риск: любой внешний клиент мог отправлять файлы через ArtistCRM в EscalionCloud, используя серверный `ESCALIONCLOUD_PASSWORD`.

Изменение:

- `app/api/cloud/route.js` теперь требует авторизованную сессию через `getTenantContext()`.
- Неавторизованный запрос получает `401`.

### 2. `/api/events/cleanup-unchecked` был публичным destructive endpoint

Риск: endpoint без авторизации удалял импортированные из календаря события, транзакции и клиентов по глобальному фильтру без `tenantId`.

Изменение:

- endpoint теперь требует авторизованного пользователя с ролью `dev` или `admin`;
- все операции ограничены текущим `tenantId`;
- `SiteSettings` пересчитываются только для текущего tenant;
- клиенты удаляются только если у них нет других мероприятий в этом tenant.

### 3. Public lead/Tilda мог сохранять API key в raw payload

Риск: если `apiKey` или `api_key` передавался в body, ключ мог попасть в `Events.clientData.lead.raw`.

Изменение:

- `server/publicLeadService.js` теперь очищает raw payload от `apiKey`, `api_key`, `token`, `secret`, `password`, `authorization` и вложенных вариантов перед сохранением.

### 4. `/api/client-log` был публичным логгером

Риск: публичный endpoint мог использоваться для log-spam и случайной записи секретов/токенов из клиентского payload.

Изменение:

- логирование выполняется только для авторизованного пользователя;
- тело ограничено 16 KB;
- чувствительные поля удаляются рекурсивно;
- строки обрезаются до 2000 символов.

### 5. YooKassa webhook принимал запросы без секрета, если env не задан

Риск: при ошибочной production-конфигурации без `YOOKASSA_WEBHOOK_SECRET` webhook принимал запрос и запускал sync по provider payment id.

Изменение:

- в `NODE_ENV=production` отсутствие `YOOKASSA_WEBHOOK_SECRET` теперь возвращает `503`;
- текущий сценарий с token query/header сохранен.

### 6. Внешние endpoints не имели общего IP/key rate-limit

Риск: brute force и abuse на phone verification, legacy auth, VK ID, mobile login, public lead/Tilda и webhooks.

Изменение:

- добавлен Mongo-backed fixed-window helper `server/rateLimit.js`;
- ключи rate-limit хэшируются, IP/телефон/API key не хранятся в открытом виде;
- добавлена TTL-модель `RateLimitCounters`;
- лимиты подключены к `/api/auth/register`, `/api/auth/reset-password`, `/api/phone/verify/*`, `/api/mobile/auth/login`, `/api/vk-id/auth`, `/api/public/lead*`, VK/Avito/Novofon/generic telephony webhooks.

### 7. Novofon webhook принимал глобальный fallback-secret

Риск: при наличии `NOVOFON_WEBHOOK_SECRET` или `TELEPHONY_WEBHOOK_SECRET` webhook мог принимать звонки в tenant, где индивидуальная интеграция выключена или не настроен пользовательский secret.

Изменение:

- Novofon webhook теперь принимает запрос только если `novofonEnabled=true` и у tenant задан `novofonWebhookSecret`;
- глобальный env fallback для Novofon больше не используется.

### 8. Legacy auth endpoints оставляли второй путь регистрации и сброса пароля

Риск: текущий UI использует новый `/api/phone/verify/finalize`, но старые `/api/auth/register` и `/api/auth/reset-password` продолжали существовать как отдельный кодовый путь.

Изменение:

- `/api/auth/register` возвращает `410 Gone`;
- `/api/auth/reset-password` возвращает `410 Gone`;
- активный UI проверен поиском: регистрация и восстановление идут через `/api/phone/verify/finalize`.

### 9. Avito raw payload сохранялся без redaction

Риск: если во входящем Avito payload появится поле `token`, `secret`, `apiKey`, `authorization` или похожее, оно могло попасть в `AvitoConversations.raw`, `AvitoMessages.raw` и `Events.clientData.lead.raw`.

Изменение:

- Avito flow теперь использует общий `sanitizeRawPayload`;
- `docs/AVITO_INTEGRATION_GUIDE.md` фиксирует, что route token является текущим shared secret для webhook, а raw payload очищается перед сохранением.

### 10. Messenger conversation endpoints могли привязать чужой `clientId/eventId`

Риск: ручная привязка Avito/VK conversations проверяла ObjectId и `tenantId` самой переписки, но не проверяла принадлежность переданных `clientId`/`eventId` текущему tenant. В `clients/[id]/messenger/candidates` route-параметр `clientId` также не проверялся на существование в текущем tenant перед записью в conversation.

Изменение:

- `app/api/integrations/avito/conversations/[id]/route.js` проверяет `clientId` через `Clients.findOne({ _id, tenantId })` и `eventId` через `Events.findOne({ _id, tenantId })`;
- `app/api/integrations/vk/conversations/[id]/route.js` делает такую же проверку;
- `app/api/clients/[id]/messenger/candidates/route.js` проверяет, что клиент из URL существует в текущем tenant перед выдачей кандидатов и перед привязкой conversation.

### 11. Платежи тарифа могли принимать произвольную сумму из клиента

Риск: при `purpose=tariff` routes YooKassa/Tochka брали положительный `amount` из request body, если он был передан. Это позволяло создать тарифный платеж с суммой, отличающейся от цены тарифа.

Изменение:

- `app/api/billing/yookassa/create/route.js` для `purpose=tariff` всегда использует `tariff.price`;
- `app/api/billing/tochka/create/route.js` делает то же самое;
- произвольная сумма остается только для обычного пополнения баланса.

### 12. Повторный billing webhook/sync мог привести к двойному начислению при гонке

Риск: при почти одновременном webhook и ручном sync один и тот же pending-платеж мог пройти обработку дважды до сохранения статуса `succeeded`.

Изменение:

- `server/yookassaPaymentProcessing.js` перед начислением баланса атомарно переводит платеж из `pending` в `succeeded`;
- `server/tochkaPaymentProcessing.js` использует такой же pending-lock;
- повторная обработка уже успешного платежа возвращает `alreadyProcessed`.

## Осталось закрыть перед публичным анонсом

### P0

- Проверить production env: `NEXTAUTH_SECRET`, `YOOKASSA_WEBHOOK_SECRET`, `BILLING_CRON_SECRET`, `PUSH_REMINDERS_CRON_SECRET`, VK/Avito/Novofon tokens должны быть длинными случайными секретами.

### P1

- Свести публичные webhook endpoints к единому helper'у: parse body, auth/secret check, sanitized logging, rate-limit, uniform error response.
- Добавить audit tests для tenant isolation: чужой `eventId/clientId/paymentId/callId` не должен читаться или изменяться. Focused code pass уже закрыл найденные проблемы в messenger conversation bindings.
- Перевести client/server logs на structured logger с automatic redaction.
- Добавить отдельный security smoke checklist в release runbook.

## Проверка

- `npx eslint app/api/cloud/route.js app/api/client-log/route.js app/api/events/cleanup-unchecked/route.js server/publicLeadService.js` прошел успешно.
- `npx eslint server/rateLimit.js models/RateLimitCounters.js schemas/rateLimitCountersSchema.js app/api/auth/register/route.js app/api/auth/reset-password/route.js app/api/phone/verify/start/route.js app/api/phone/verify/check/route.js app/api/phone/verify/sms/send/route.js app/api/phone/verify/sms/check/route.js app/api/phone/verify/finalize/route.js app/api/mobile/auth/login/route.js app/api/vk-id/auth/route.js app/api/public/lead/route.js app/api/public/lead/tilda/route.js "app/api/integrations/vk/webhook/[token]/route.js" "app/api/integrations/avito/webhook/[token]/route.js" app/api/telephony/generic/webhook/route.js app/api/telephony/novofon/webhook/route.js` прошел успешно.
- `rg -n "/api/auth/register|/api/auth/reset-password|phone/verify/finalize" app components layouts helpers` подтвердил, что UI использует `/api/phone/verify/finalize`, а legacy endpoints не вызываются.
- `npx eslint server/avito.js "app/api/integrations/avito/conversations/[id]/route.js" "app/api/integrations/vk/conversations/[id]/route.js" "app/api/clients/[id]/messenger/candidates/route.js"` прошел успешно.
- `npx eslint app/api/billing/yookassa/create/route.js app/api/billing/tochka/create/route.js server/yookassaPaymentProcessing.js server/tochkaPaymentProcessing.js` прошел успешно.
- `npx eslint .` прошел успешно.
- `node --test helpers/*.test.js` прошел успешно: 42 tests, 42 pass.
