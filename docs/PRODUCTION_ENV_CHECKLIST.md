# ArtistCRM Production ENV Checklist

Документ фиксирует production-переменные для ArtistCRM.

Правило: в production env ArtistCRM держим только глобальные настройки продукта и инфраструктуры. Novofon, AITunnel и AI-ключи пользователей не должны лежать в `.env`, если пользователь подключает эти сервисы сам в `Настройки -> Интеграции`.

## Обязательные базовые переменные

```env
NODE_ENV=production
DOMAIN=https://artistcrm.ru

MONGODB_URI=...
MONGODB_DBNAME=...

NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://artistcrm.ru
NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3006
```

Рекомендации:

- `NEXTAUTH_SECRET` должен быть длинным случайным секретом, а не названием проекта.
- `MONGODB_URI` и OAuth callback URL лучше указывать итоговыми строками без shell-подстановок `${...}`.
- Для приложения достаточно `MONGODB_URI` и `MONGODB_DBNAME`; `MONGODB_SERVER`, `MONGODB_PORT`, `MONGODB_USER`, `MONGODB_PASSWORD` можно держать только в deploy-скриптах.
- Использовать отдельного MongoDB-пользователя с `readWrite` только на базе `artistcrm`, а не административного пользователя MongoDB.

## PartyCRM в ArtistCRM env

Если этот же ArtistCRM runtime обслуживает домен `partycrm.ru`, нужны:

```env
PARTYCRM_DOMAIN=partycrm.ru
PARTYCRM_MONGODB_URI=mongodb://partycrm_app:<password>@127.0.0.1:27017/?authSource=admin
PARTYCRM_MONGODB_DBNAME=partycrm
```

Если PartyCRM запускается отдельным проектом/процессом, эти переменные из ArtistCRM `.env` нужно убрать.

## Оплаты

ЮKassa:

```env
YOOKASSA_SECRET_KEY=...
YOOKASSA_SHOP_ID=...
YOOKASSA_RETURN_URL=https://artistcrm.ru/cabinet/tariff-select?payment=yookassa
YOOKASSA_WEBHOOK_SECRET=...
YOOKASSA_SEND_RECEIPT=false
YOOKASSA_VAT_CODE=1
```

Точка:

```env
TOCHKA_API_TOKEN=...
TOCHKA_CLIENT_ID=...
TOCHKA_CUSTOMER_CODE=...
TOCHKA_MERCHANT_ID=...
TOCHKA_SEND_RECEIPT=false
TOCHKA_VAT_TYPE=none
TOCHKA_RECEIPT_CLIENT_CONTACT=phone
TOCHKA_RECEIPT_ITEM_NAME=Оплата ArtistCRM
TOCHKA_RECEIPT_EMAIL=support@artistcrm.ru
```

Если включаются чеки Точки, дополнительно проверить:

```env
TOCHKA_TAX_SYSTEM_CODE=...
TOCHKA_PAYMENT_METHOD=full_payment
TOCHKA_PAYMENT_OBJECT=service
TOCHKA_MEASURE=шт.
TOCHKA_PAYMENT_TTL=1440
TOCHKA_WEBHOOK_PUBLIC_JWK=...
```

## Публичные юридические данные

```env
NEXT_PUBLIC_LEGAL_NAME=ArtistCRM
NEXT_PUBLIC_LEGAL_INN=...
NEXT_PUBLIC_SUPPORT_EMAIL=support@artistcrm.ru
```

## Push и cron

```env
BILLING_CRON_SECRET=...
PUSH_REMINDERS_CRON_SECRET=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@artistcrm.ru
```

Cron для `/api/push/reminders/additional-events` можно запускать каждые 15
минут. Приложение само отфильтрует пользователей по времени ежедневных
напоминаний из `Настройки -> Уведомления`; если время не задано, используется
`10:00` в часовом поясе пользователя.

## VK ID

```env
VK_AUTH_ENABLED=true
VK_ID_APP_ID=...
VK_ID_CLIENT_SECRET=...
VK_ID_REDIRECT_URI=https://artistcrm.ru/api/vk-id/callback
NEXT_PUBLIC_VK_ID_SCOPE=phone email
```

Опционально:

```env
VK_DEBUG_LOGS=false
NEXT_PUBLIC_VK_DEBUG_LOGS=false
VK_ID_DOMAIN=id.vk.ru
```

## Google Calendar

```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://artistcrm.ru/api/google-calendar/callback
```

Опционально для service account сценариев:

```env
GOOGLE_CALENDAR_CREDENTIALS_PATH=...
```

## Телефонная верификация и SMS

```env
TELEFONIP=...
```

Опционально:

```env
TELEFONIP_API_BASE_URL=https://api.telefon-ip.ru
PHONE_SMS_SEND_WEBHOOK=...
```

`TELEFONIP` используется для подтверждения телефона при регистрации и восстановлении доступа. `PHONE_SMS_SEND_WEBHOOK` нужен только для SMS fallback.

## Novofon и AI

Общий ИИ ArtistCRM, оплачиваемый из баланса пользователя:

```env
AITUNNEL_KEY=...
AITUNNEL_CALL_ANALYSIS_MODEL=gpt-4o-mini
AITUNNEL_TRANSCRIPTION_MODEL=whisper-1
```

`AITUNNEL_KEY` обязателен для сервисного режима. Наценка задаётся developer-пользователем на странице `Настройки сайта -> ИИ и расходы` и не хранится в env.

Следующие глобальные fallback-переменные не добавлять, если они не нужны для developer-сценариев:

```env
NOVOFON_WEBHOOK_SECRET
AI_ANALYSIS_PROVIDER
AI_TRANSCRIPTION_PROVIDER
DEEPSEEK_API_KEY
DEEPSEEK_CALL_ANALYSIS_MODEL
OPENAI_CALL_ANALYSIS_MODEL
OPENAI_TRANSCRIPTION_MODEL
```

Пользователь может подключить собственный AITunnel key в `SiteSettings.custom`. В этом режиме ArtistCRM не списывает стоимость запросов. DeepSeek оставлен только для developer-роли и работает с готовым текстом, без speech-to-text.

Глобальный OpenAI-совместимый ключ можно оставить только как developer fallback:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

Если глобальный fallback не нужен, переменные `OPENAI_*` можно не задавать.

## Почта и файлы

```env
ESCALIONCLOUD_PASSWORD=...
TELEGRAM_TOKEN=...

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@artistcrm.ru
SMTP_PASSWORD=...
MAIL_FROM=ArtistCRM <support@artistcrm.ru>
```

`ESCALIONCLOUD_PASSWORD` и `TELEGRAM_TOKEN` нужны только если используются соответствующие функции проекта.

## Frontend diagnostics

```env
NEXT_PUBLIC_ENABLE_SOURCE_MAPS=false
```

## Лишнее или подозрительное

Эти переменные нужно убрать из ArtistCRM production env:

```env
LOGIN
PASSWORD
SECRET
NEXTAUTH_SITE
DEEPSEEK_KEY
PARTYCRM_AUTH_SECRET
PARTYCRM_BOOTSTRAP_SECRET
PARTYCRM_YOOKASSA_WEBHOOK_SECRET
NODE_TLS_REJECT_UNAUTHORIZED
```

Если PartyCRM не обслуживается этим же runtime, также убрать:

```env
PARTYCRM_DOMAIN
PARTYCRM_MONGODB_URI
PARTYCRM_MONGODB_DBNAME
```

Проверить кодировку:

```env
TOCHKA_RECEIPT_EMAIL=support@artistcrm.ru
TOCHKA_RECEIPT_ITEM_NAME=Оплата ArtistCRM
```
