# ArtistCRM Official Launch Plan

Дата аудита: 2026-06-07.

Этот документ фиксирует, что еще нужно сделать перед официальным публичным анонсом ArtistCRM. Основание: текущий `docs/ROADMAP.md`, структура `app/api`, модели `models/*`, схемы `schemas/*`, настройки production, публичный лендинг, интеграции, биллинг, PWA/offline и существующие тесты.

## Короткий вывод

ArtistCRM близок к официальному запуску. Основное продуктовое ядро уже собрано: заявки и мероприятия, клиенты, транзакции, задатки, документы, Google Calendar, входящие лиды, Tilda, VK, Avito, телефония, AI-черновики, push/PWA, тарифы и платежи.

Главный риск перед анонсом не в отсутствии базовой функциональности, а в надежности production-сценариев: реальные E2E-проверки интеграций, безопасность авторизации и webhook'ов, платежи, юридические документы, мониторинг, backup/restore, offline-очередь и качество первого входа нового пользователя.

Рекомендация: выпускать публичный анонс только после закрытия блока P0 ниже. Остальное можно оставить как P1/P2 после запуска.

## Что уже выглядит готовым

- Основной кабинет: `app/cabinet/[page]/cabinet.js`, `layouts/content/contentsMap.js`, разделы предстоящих/прошедших мероприятий, клиентов, транзакций, услуг, статистики, документов, интеграций и уведомлений.
- Заявки и мероприятия: `models/Events.js`, `schemas/eventsSchema.js`, `app/api/events/**`, статусы `draft`, `active`, `canceled`, `closed`, доп. события `additionalEvents[]`, month-view, быстрые действия и массовые сценарии закрытия.
- Клиенты: `models/Clients.js`, `schemas/clientsSchema.js`, реквизиты клиента, merge дублей, связи с мероприятиями, транзакциями, звонками и мессенджерами.
- Финансы: `models/Transactions.js`, категории `deposit`, `final_payment`, `taxes`, `referral_*`, статистика маржинальности, контроль задатка через транзакции и `waitDeposit`.
- Документы: генерация договора и акта через `helpers/generateContractTemplate.js`, `helpers/generateActTemplate.js`, `helpers/exportDocxFromTemplate.js`, пользовательская документация `docs/DOCX_DOCUMENTS_GUIDE.md`.
- Входящие заявки: `app/api/public/lead/route.js`, `app/api/public/lead/tilda/route.js`, несколько API-ключей и инструкция `docs/PUBLIC_LEADS_API.md`.
- Google Calendar: `app/api/google-calendar/**`, `server/googleUserCalendarClient.js`, синхронизация мероприятий и доп. событий.
- VK и Avito: модели переписок/сообщений, webhooks, UI в интеграциях, связь диалогов с клиентами, документы `docs/VK_GROUP_INTEGRATION_GUIDE.md` и `docs/AVITO_INTEGRATION_GUIDE.md`.
- Телефония и AI: `app/api/calls/**`, `server/calls.js`, `server/callTranscription.js`, `server/callAiAnalysis.js`, `server/novofon.js`, AI-черновик заявки по звонку и голосу.
- Push/PWA/offline: `app/api/push/**`, `server/additionalEventsPushReminders.js`, `helpers/serverSyncQueue.js`, настройки уведомлений и local/offline queue.
- Биллинг и тарифы: YooKassa, Tochka, тарифные флаги `allowCalendarSync`, `allowStatistics`, `allowDocuments`, `allowTelephony`, `allowAi`.
- SEO: публичная главная, посадочные страницы, sitemap, robots, OG image, SEO-документация и monitoring checklist.

## P0: сделать до официального анонса

### 1. Production freeze и среда запуска

- [x] Провести аудит текущего production `.env` ArtistCRM: оставить глобальные переменные продукта, убрать лишние PartyCRM/Novofon/AI fallback-переменные, если эти сервисы настраиваются пользователями индивидуально.
- [ ] Применить очищенный production env на сервере: перевыпустить засвеченные секреты, заменить слабые `NEXTAUTH_SECRET`/cron/payment/API keys, явно прописать `MONGODB_URI` и `GOOGLE_OAUTH_REDIRECT_URI`.
- [x] Зафиксировать production env по `docs/PRODUCTION_ENV_CHECKLIST.md`: `DOMAIN`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, MongoDB, платежи, push, cron, VK ID, Google OAuth, SMTP; Novofon/AI/распознавание звонков не требуются как глобальные env, если пользователь настраивает их индивидуально.
- [x] Проверить, что `.env.example` и `.env.deploy.example` не обещают устаревшие переменные и не содержат реальных секретов.
- [ ] Проверить SSL, canonical redirect на `https://artistcrm.ru`, редирект `www -> apex`, sitemap и robots на production.
- [ ] Проверить, что `NEXT_PUBLIC_ENABLE_SOURCE_MAPS` выключен для production.
- [ ] Подготовить production seed тарифов и проверить, что скрытые тарифы не попадают на публичную главную.
- [ ] Проверить, что cron endpoints защищены секретами: биллинг, push-напоминания, синхронизации.
- [ ] Настроить регулярный backup MongoDB и ручной restore-check на тестовой базе по `docs/ARTISTCRM_BACKUP_RESTORE_RUNBOOK.md`.
- [x] Проверить индексы MongoDB для `Events`, `Clients`, `Transactions`, `Calls`, `VkConversations`, `AvitoConversations`, `PushReminderLogs`; добавлены недостающие индексы для списков звонков, звонков клиента, сортировки клиентов и связей мероприятий с коллегой.
- [x] Прогнать production-сборку `npm run build` после P0 security-правок.

### 2. Минимальная E2E-матрица перед релизом

Проверить вручную по `docs/ARTISTCRM_RELEASE_SMOKE_RUNBOOK.md` или автоматизировать в Playwright. Цель - не идеальное покрытие, а отсутствие провала базовых путей первого пользователя.

- [ ] Регистрация по телефону: старт подтверждения, SMS/call fallback, завершение, вход.
- [ ] Вход через VK ID One Tap: существующий пользователь, новый пользователь, отказ/ошибка, повторный вход.
- [ ] Восстановление пароля и смена пароля.
- [ ] Первый вход: профиль, onboarding, быстрый старт, создание услуги.
- [ ] Создание клиента с телефоном, соцсетями и реквизитами.
- [ ] Создание заявки `draft`, перевод в мероприятие `active`, отмена, закрытие.
- [ ] Доп. события: создать, перенести, закрыть, увидеть бейджи `просрочено/сегодня/завтра`.
- [ ] Транзакции: задаток, остаток оплаты, расход, налоги, связь с мероприятием и клиентом.
- [ ] Статистика: фильтр по году/городу/статусу, маржа, экспорт CSV.
- [ ] Документы: предпросмотр договора, экспорт DOCX, акт, реквизиты артиста и клиента.
- [ ] Google Calendar: подключить, выбрать календарь, создать мероприятие, обновить, удалить, импортировать, отключить.
- [ ] Public lead API: создать заявку по ключу, проверить источник, push, карточку заявки.
- [ ] Tilda adapter: проверить реальный payload Tilda и дубль клиента.
- [ ] VK group: confirmation, первое сообщение, ответ из CRM, отсутствие дублей, отключение.
- [ ] Avito: подключение, первое сообщение, ответ из CRM, отсутствие дублей, отключение.
- [ ] Телефония Novofon/generic: входящий звонок, связь с клиентом, transcript, AI-черновик, создание заявки.
- [ ] PWA push: subscribe, test, новая API-заявка, напоминание по доп. событию, notification click.
- [ ] Offline/privacy режим: создать/изменить данные без сети, восстановить сеть, replay очереди, конфликтные изменения.
- [ ] Биллинг: пополнение/оплата тарифа YooKassa, webhook, sync, продление, истечение тарифа, возврат/компенсация.
- [ ] Мобильный экран 360-430 px: модалки, карточки, фильтры, меню, документы и интеграции без горизонтального скролла.

### 3. Security и защита от злоупотреблений

- [x] Провести focused P0 security-аудит публичных/destructive endpoints и зафиксировать результаты в `docs/ARTISTCRM_P0_SECURITY_AUDIT.md`.
- [x] Закрыть найденные публичные P0 endpoints: `/api/cloud`, `/api/events/cleanup-unchecked`, `/api/client-log`, raw payload public leads, production fallback YooKassa webhook.
- [x] Закрыть найденные billing P0 code risks: тарифные платежи YooKassa/Tochka используют цену тарифа, а не `amount` из клиента; успешный sync/webhook получает атомарный pending-lock перед начислением баланса.
- [x] Добавить базовый Mongo-backed rate-limit для `/api/auth/register`, `/api/auth/reset-password`, `/api/phone/verify/*`, `/api/vk-id/auth`, `/api/mobile/auth/login`, `/api/public/lead*`, webhook'ов VK/Avito/телефонии.
- [x] Провести focused tenant isolation pass по основным API и исправить найденные проблемы в Avito/VK messenger conversation bindings.
- [ ] Проверить, что публичные endpoints не раскрывают user/tenant id, email, телефон, токены или внутренние ошибки.
- [ ] Проверить webhook validation: VK secret/group id, Avito token/signature/источник, Novofon secret, generic telephony secret.
- [ ] Проверить, что токены, API keys, secrets, transcripts и записи звонков не пишутся в client/server logs.
- [x] Проверить hardcoded-значения в `server/tochka.js`: зафиксировано, что встроенный `TOCHKA_WEBHOOK_JWK` содержит публичный RSA JWK для проверки подписи webhook; ротация возможна через `TOCHKA_WEBHOOK_PUBLIC_JWK`.
- [ ] Провести быстрый audit cookies/session flags: `httpOnly`, `secure`, `sameSite`, корректный domain.
- [ ] Проверить удаление/архивацию клиента и связанных данных с учетом персональных данных.

### 4. Юридический и платежный контур

- [ ] Финально вычитать `app/privacy/page.js`, `app/terms/page.js`, `app/payment/page.js`, `app/personal-data-consent/page.js`.
- [ ] Проверить юридические реквизиты через `NEXT_PUBLIC_LEGAL_*` и поддержку email.
- [ ] Добавить явное согласие на обработку записей звонков/transcript/AI-анализа, если функциональность включена пользователем.
- [ ] Проверить тексты про возвраты, тарифы, списания и trial.
- [ ] Проверить YooKassa/Tochka receipts: ставка НДС, предмет расчета, контакт покупателя, webhook secret, возвраты.
- [ ] Подготовить шаблон ответа поддержки по оплатам, возвратам и удалению данных.

### 5. Monitoring, support и операционная готовность

- [ ] Подключить error monitoring для frontend/backend ошибок или утвердить текущий канал логирования.
- [ ] Добавить health-check endpoints/дашборд для MongoDB, push, billing webhooks, Google OAuth, VK/Avito/Novofon.
- [ ] Настроить алерты по: 500 errors, webhook failures, billing sync failures, cron failures, MongoDB connectivity, всплеск auth/phone attempts.
- [ ] Подготовить support-инбокс: `support@artistcrm.ru`, SLA реакции, шаблоны ответов.
- [ ] Подготовить rollback-план: как откатить релиз, как выключить интеграцию, как отключить webhook, как восстановить backup.
- [ ] Подготовить внутренний changelog релиза и список известных ограничений.

### 6. Публичная часть и анонс

- [ ] Завершить `SEO-T9`: Lighthouse mobile, Core Web Vitals, LCP/CLS, шрифты, изображения, размер JS/CSS.
- [ ] Проверить главную и посадочные страницы: тексты соответствуют реально работающим возможностям.
- [ ] Проверить OG-картинку в Telegram, VK, WhatsApp, Twitter/X.
- [ ] Подготовить короткую демо-инструкцию: "как за 10 минут завести первую заявку".
- [ ] Подготовить 3-5 скриншотов реальных рабочих сценариев: заявка, карточка мероприятия, финансы, документы, календарь, интеграции.
- [ ] Подготовить письмо/пост анонса с ограничением ожиданий: какие интеграции доступны, какие требуют внешнего аккаунта/доступа.

## P1: улучшить в первые 2-4 недели после анонса

- [ ] Avito real-world E2E: подтвердить требования API, отправку сообщений, отключение webhook и синхронизацию истории чата из API.
- [ ] VK real-world E2E: провести проверку на реальной группе с подтверждением сервера, первым сообщением и ответом из CRM.
- [ ] Offline-очередь: статусы по каждому элементу, retry/backoff, конфликты, понятный UI восстановления после ошибок.
- [ ] Обучающие материалы: quick-start, FAQ, видео 3-5 минут, чеклист первого дня, примеры Tilda/API payload.
- [ ] Расширенная финансовая аналитика: динамика по месяцам, источники лидов, конверсия заявок, прибыльность услуг.
- [ ] Улучшить импорты: миграция клиентов/событий из Excel/CSV для первых пользователей.
- [ ] Добавить in-app feedback: "сообщить об ошибке", "предложить улучшение", автоматическое прикладывание версии приложения.
- [ ] Подготовить pilot-программу: 5-10 пользователей, созвон раз в неделю, сбор метрик и проблем.

## P2: стратегические улучшения после стабилизации

- [ ] React Native + Expo приложение или полноценный mobile companion, когда web/PWA стабилен.
- [ ] AI-подсказки по следующим действиям: когда перезвонить, что уточнить, какой документ подготовить.
- [ ] Расширенные интеграции: Telegram bot, WhatsApp/ВК формы, email parsing, inbound call routing.
- [ ] Пакетные операции: массовое закрытие задач, массовое выставление напоминаний, bulk import.
- [ ] Больше автоматизации документов: несколько шаблонов договоров, счета, закрывающие документы, пользовательские переменные.
- [ ] Customer success аналитика: воронка первого входа, activation rate, retention, причины отмены тарифа.

## Релизный порядок работ

1. Freeze: остановить новые feature-изменения, кроме P0-багфиксов.
2. Smoke: пройти E2E-матрицу на staging/production clone.
3. Security: закрыть auth/rate-limit/webhook/tenant isolation проверки.
4. Billing: провести реальные платежи минимальными суммами и webhook sync.
5. Integrations: провести реальные VK/Avito/Google/Novofon проверки хотя бы на одном тестовом tenant.
6. Legal: финальная вычитка документов и реквизитов.
7. Monitoring: включить алерты и backup.
8. Pilot: 5-10 первых пользователей без широкого анонса.
9. Public launch: официальный пост, сайт, поддержка, мониторинг первой недели.

## Критерии готовности к официальному анонсу

- Все P0-пункты либо закрыты, либо имеют явное решение "осознанно переносим, не обещаем публично".
- 3 тестовых пользователя прошли путь: регистрация -> первая заявка -> мероприятие -> задаток -> документ -> напоминание.
- Хотя бы по одному реальному сценарию проверены Google Calendar, Public lead/Tilda, VK или Avito, billing, push.
- Нет известных критичных ошибок по tenant isolation, платежам, авторизации, потере данных и публичным webhook'ам.
- Есть backup/restore процедура и человек, ответственный за мониторинг первых 7 дней.

## Отдельные замечания по запуску

- ArtistCRM уже выглядит как продукт для запуска, поэтому не стоит откладывать анонс ради P2-функций.
- Самые опасные незакрытые зоны: реальные E2E интеграций, платежи, offline-конфликты, rate-limit, юридические согласия по звонкам/AI.
- Если Avito API доступен не всем целевым пользователям, публичный текст должен честно объяснять требования к аккаунту Avito.
- Если телефония или AI зависят от внешних ключей пользователя, onboarding должен прямо говорить, что нужно подключить.
