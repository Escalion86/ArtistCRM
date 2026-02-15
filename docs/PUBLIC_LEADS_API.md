# Public Leads API

## Назначение

`POST /api/public/lead` позволяет принимать входящие заявки с сайта (или другой внешней формы) прямо в CRM.

После успешного запроса:
- создается или обновляется клиент;
- создается заявка-мероприятие со статусом `draft`.

## Быстрый старт (3 шага)

1. Включите API в кабинете: `Настройки -> Интеграции -> Принимать заявки через API`.
2. Сгенерируйте и скопируйте API key.
3. Отправьте тестовый `POST` на `/api/public/lead` (пример ниже) и проверьте, что в CRM появилась новая заявка со статусом `draft`.

## Включение в кабинете

Откройте `Настройки -> Интеграции`:
1. Включите чекбокс `Принимать заявки через API`.
2. Нажмите `Сгенерировать ключ`.
3. Скопируйте ключ (`Копировать ключ`).

Без включенного чекбокса endpoint вернет `403`.

## Endpoint

- Method: `POST`
- URL: `/api/public/lead`
- Content-Type: `application/json`
- CORS: разрешен (`OPTIONS`, `POST`)

## Авторизация

Передайте ключ одним из способов:
- header `X-Public-Api-Key`
- header `X-Api-Key`
- поле `apiKey` в body

Рекомендуется использовать `X-Public-Api-Key`.

## Минимальные требования

Нужен хотя бы один контакт:
- `name` или
- `phone` или
- `telegram` или
- `whatsapp`

## Поддерживаемые поля запроса

- `name` или `clientName` — имя клиента
- `phone` или `clientPhone` — телефон
- `whatsapp` — WhatsApp
- `telegram` — Telegram
- `comment` или `description` или `message` — комментарий
- `eventDate` — дата начала (ISO)
- `dateEnd` — дата окончания (ISO)
- `contractSum` — договорная сумма
- `servicesIds` — массив id услуг
- `town` или `city` — город
- `address` или `location` — адрес/локация
- `source` — источник заявки (например `tilda`)

## Что передавать обязательно и что желательно

- Обязательно: хотя бы одно контактное поле
  - `name` или `phone` или `telegram` или `whatsapp`
- Рекомендуемый минимум для качественной заявки:
  - `name`
  - `phone`
  - `comment`
  - `eventDate` (ISO)
  - `town`
  - `address`
  - `source`

## Пример запроса

```bash
curl -X POST "https://YOUR_DOMAIN/api/public/lead" \
  -H "Content-Type: application/json" \
  -H "X-Public-Api-Key: YOUR_API_KEY" \
  -d '{
    "name": "Иван",
    "phone": "+7 (999) 123-45-67",
    "comment": "Нужен артист на день рождения",
    "eventDate": "2026-03-10T15:00:00.000Z",
    "town": "Красноярск",
    "address": "ул. Ленина, 10",
    "source": "tilda"
  }'
```

## Успешный ответ

```json
{
  "success": true,
  "data": {
    "eventId": "65f...",
    "clientId": "65e...",
    "status": "draft"
  }
}
```

## Ошибки

- `401` — не передан API key
- `403` — неверный API key
- `403` — прием заявок через API отключен
- `403` — у пользователя не выбран тариф
- `400` — нет обязательного контакта
- `400` — `eventDate` позже `dateEnd`
- `500` — внутренняя ошибка сервера

## Примечания

- По телефону клиент ищется в рамках вашего tenant; если найден, переиспользуется.
- При создании заявки используется статус `draft`.
- Исходный payload сохраняется в `event.clientData.lead.raw`.

## Tilda adapter

Доступен отдельный адаптер:
- `POST /api/public/lead/tilda`
- нормализация типовых полей Tilda в формат CRM.

### Временная схема подключения Tilda

1. В Tilda настройте отправку данных в webhook URL:
   - `https://YOUR_DOMAIN/api/public/lead/tilda`
2. Добавьте header:
   - `X-Public-Api-Key: YOUR_API_KEY`
3. Передавайте как минимум одно контактное поле:
   - `name` или `phone` или `telegram` или `whatsapp`

### Рекомендуемое сопоставление полей из формы Tilda

- `name` -> `name`
- `phone` -> `phone`
- `message`/`comment` -> `comment`
- `city` -> `town`
- `event_date` -> `eventDate` (ISO)
- `source` -> `source` (например `tilda`)

Поддерживаются также частые алиасы:
- имя: `clientName`, `client_name`, `fio`, `fullname`, `Имя`, `ФИО`
- телефон: `clientPhone`, `client_phone`, `tel`, `Телефон`
- комментарий: `description`, `text`, `Комментарий`
- город: `town`, `city`, `gorod`, `Город`
- адрес: `address`, `location`, `Адрес`

### Пример запроса в Tilda adapter

```bash
curl -X POST "https://YOUR_DOMAIN/api/public/lead/tilda" \
  -H "Content-Type: application/json" \
  -H "X-Public-Api-Key: YOUR_API_KEY" \
  -d '{
    "name": "Иван",
    "phone": "+7 (999) 123-45-67",
    "message": "Нужен артист на выпускной",
    "city": "Красноярск",
    "event_date": "2026-04-20T14:00:00.000Z",
    "source": "tilda"
  }'
```

### Минимальный JSON для Tilda adapter

```json
{
  "name": "Иван",
  "phone": "+79991234567",
  "message": "Нужен артист",
  "source": "tilda"
}
```
