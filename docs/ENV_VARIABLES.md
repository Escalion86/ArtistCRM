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
- Телефония: `TELEFONIP`, `PHONE_SMS_SEND_WEBHOOK`, `TELEPHONY_WEBHOOK_SECRET`, `NOVOFON_WEBHOOK_SECRET`
- Telegram: `TELEGRAM_TOKEN`
- AI-анализ/транскрибация: `AI_*`, `DEEPSEEK_*`, `AITUNNEL_*`, `OPENAI_*`
- Облачные файлы: `ESCALIONCLOUD_PASSWORD`

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

## Примечание

- Шаблоны лежат в `.env.example` и `.env.deploy.example`.
- Реальные `.env.local` и `.env.deploy` не должны храниться в git.
