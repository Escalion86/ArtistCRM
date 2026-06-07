# ArtistCRM ENV

## Обязательные переменные

```env
NODE_ENV=development|production
DOMAIN=http://localhost:3000
MONGODB_URI=...
MONGODB_DBNAME=artistcrm_dev
NEXTAUTH_SECRET=...
```

## Нужны только если включен соответствующий функционал

- Google Calendar: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`
- Биллинг YooKassa: `YOOKASSA_*`
- Биллинг Точка: `TOCHKA_*`
- Push и cron: `BILLING_CRON_SECRET`, `PUSH_REMINDERS_CRON_SECRET`, `VAPID_*`
- VK ID: `VK_*`, `NEXT_PUBLIC_VK_*`
- Подтверждение телефона: `TELEFONIP`, `TELEFONIP_API_BASE_URL`, `PHONE_SMS_SEND_WEBHOOK`
- Generic telephony webhook: `TELEPHONY_WEBHOOK_SECRET`, только если используется глобальный generic endpoint
- Telegram: `TELEGRAM_TOKEN`, только если используется отправка сообщений через Telegram bot
- Голосовой AI-черновик `/api/events/ai-draft`: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, только если функция работает через общий ключ сервиса
- Облачные файлы: `ESCALIONCLOUD_PASSWORD`

Novofon, AITunnel и AI-анализ/транскрибация звонков в текущей модели ArtistCRM настраиваются каждым пользователем индивидуально в `Настройки -> Интеграции` и хранятся в `SiteSettings.custom`. Поэтому `NOVOFON_WEBHOOK_SECRET`, `AI_ANALYSIS_PROVIDER`, `AI_TRANSCRIPTION_PROVIDER`, `DEEPSEEK_*`, `AITUNNEL_*`, `OPENAI_CALL_ANALYSIS_MODEL` и `OPENAI_TRANSCRIPTION_MODEL` не нужны в production `.env`, если не нужен глобальный fallback для всех пользователей.

## Что убрать из ArtistCRM

После разделения продуктов в `ArtistCRM` больше не нужны:

```env
PARTYCRM_DOMAIN
PARTYCRM_MONGODB_URI
PARTYCRM_MONGODB_DBNAME
PARTYCRM_AUTH_SECRET
PARTYCRM_BOOTSTRAP_SECRET
PARTYCRM_YOOKASSA_WEBHOOK_SECRET
```

Также можно убрать legacy-переменные, если везде используете нормальный `NEXTAUTH_SECRET`:

```env
LOGIN
PASSWORD
SECRET
NEXTAUTH_SITE
```

Глобальные fallback-переменные, которые не нужны при пользовательских настройках Novofon/AITunnel:

```env
NOVOFON_WEBHOOK_SECRET
AI_ANALYSIS_PROVIDER
AI_TRANSCRIPTION_PROVIDER
DEEPSEEK_API_KEY
DEEPSEEK_CALL_ANALYSIS_MODEL
AITUNNEL_KEY
AITUNNEL_CALL_ANALYSIS_MODEL
AITUNNEL_TRANSCRIPTION_MODEL
OPENAI_CALL_ANALYSIS_MODEL
OPENAI_TRANSCRIPTION_MODEL
```

## Примечание

- Шаблоны лежат в `.env.example` и `.env.deploy.example`.
- Реальные `.env.local` и `.env.deploy` не должны храниться в git.
