# SEO и аналитика после публикации

## 1. Автоматическая проверка production

```bash
npm run seo:check -- https://artistcrm.ru
```

Проверяются главная, шесть SEO-посадочных и пять практических материалов: HTTP 200, canonical, отсутствие
`noindex`, наличие `title` и `h1`, а также `robots.txt` и `sitemap.xml`.

Локальную production-сборку с production canonical можно проверить так:

```bash
npm run seo:check -- http://127.0.0.1:3000 https://artistcrm.ru
```

## 2. Отправка изменённых страниц в Яндекс через IndexNow

После публикации версии, содержащей файл IndexNow-ключа:

```bash
npm run seo:indexnow
```

Команда отправляет только изменённые публичные страницы. Для отдельного URL:

```bash
npm run seo:indexnow -- /crm-dlya-artistov
```

## 3. Google Search Console

1. Открыть свойство `artistcrm.ru`.
2. В разделе **Файлы Sitemap** добавить `https://artistcrm.ru/sitemap.xml`.
3. Через **Проверку URL** выполнить проверку опубликованной версии и нажать
   **Запросить индексирование** для главной и пяти посадочных из списка ниже.
4. Через 7–14 дней проверить отчёты **Индексирование страниц** и
   **Эффективность**: запросы, показы, CTR, среднюю позицию и страницы входа.

## 4. Яндекс Вебмастер

1. В **Индексирование → Файлы Sitemap** добавить
   `https://artistcrm.ru/sitemap.xml` или запустить его повторную обработку.
2. В **Индексирование → Переобход страниц** вставить список URL ниже.
3. Связать счётчик Метрики `108801563` с сайтом и включить
   **Индексирование → Обход по счётчикам**.
4. Проверить результат IndexNow в соответствующем отчёте Вебмастера.

## 5. URL для переобхода

```text
https://artistcrm.ru/
https://artistcrm.ru/crm-dlya-fokusnikov
https://artistcrm.ru/crm-dlya-artistov
https://artistcrm.ru/crm-dlya-vedushchih
https://artistcrm.ru/crm-dlya-muzykantov
https://artistcrm.ru/crm-dlya-tilda-zayavok
https://artistcrm.ru/crm-s-google-calendar
https://artistcrm.ru/kak-artistu-ne-teryat-zayavki-iz-messendzherov
https://artistcrm.ru/kak-kontrolirovat-zadatki-za-vystupleniya
https://artistcrm.ru/crm-ili-google-kalendar-dlya-artista
https://artistcrm.ru/kak-vesti-zayavki-fokusniku
https://artistcrm.ru/kak-ponyat-svobodna-li-data-meropriyatiya
```

## 6. Цели Яндекс Метрики

В счётчике `108801563` создать цели типа **JavaScript-событие** с идентификаторами:

| Этап                                  | Идентификатор                 | Параметры                     |
| ------------------------------------- | ----------------------------- | ----------------------------- |
| Клик по CTA публичной страницы        | `landing_cta_click`           | `page`, `placement`, `tariff` |
| Открытие регистрации                  | `registration_page_open`      | `entry`                       |
| Начало подтверждения телефона         | `registration_start`          | `method`                      |
| Телефон подтверждён                   | `registration_phone_verified` | `method`                      |
| Регистрация завершена                 | `registration_success`        | `method`                      |
| Создана первая заявка или мероприятие | `first_crm_item_created`      | `itemType`                    |

Дополнительные уже существующие цели: `first_request_created`,
`first_event_created`, `calendar_connected`, `tariff_page_open`,
`payment_intent`, `transaction_created`.

Основной отчёт строится по источникам трафика с последовательным сравнением
конверсии между шестью этапами. Для CTA отдельно сравниваются `page` и
`placement`, чтобы видеть, какая страница и кнопка приводят качественные
регистрации.
