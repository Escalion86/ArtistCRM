# ArtistCRM Android

Полноценный пользовательский Android-клиент ArtistCRM на Expo SDK 55 и React Native. Управление тарифами, ролями, публичным сайтом и dev-инструменты в приложение не переносятся.

## Возможности версии 1.0

- авторизация по телефону, регистрация, восстановление пароля и VK ID PKCE;
- отдельные сессии устройств, отзыв сессий, выход и удаление аккаунта;
- главная, мероприятия, клиенты, финансы и личные разделы;
- услуги, группы, документы DOCX, звонки, статистика, списки, интеграции, уведомления, рефералы и профиль;
- зашифрованная SQLCipher-база, offline CRUD, outbox, tombstones, конфликты и очередь файлов;
- Expo push с быстрыми действиями и deep links;
- серверный API `/api/mobile/v1` с bearer access/refresh-сессиями и tenant isolation.

Caller ID через Android `CallScreeningService`, виджеты и Share Target относятся к версии 1.1+.

## Локальный запуск

```bash
cd mobile
npm ci
copy .env.example .env
npm run start
```

Для Android development build используйте EAS или локальный prebuild. Expo Go не поддерживает SQLCipher-конфигурацию production-клиента.

Переменные `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api
EXPO_PUBLIC_APP_SCHEME=artistcrm
EXPO_PUBLIC_VK_ID_APP_ID=...
```

Production-сборка обязана использовать HTTPS API. Валидатор запрещает localhost, HTTP, резервное копирование Android и опасные разрешения call log/overlay.

## Проверки

```bash
npm run typecheck
npm test
npm run doctor
npm run release:validate
```

`release:validate` читает `.env`, если файл существует. Для локальной проверки production-конфига можно временно передать публичные переменные окружения процесса.

## Нативный проект и сборка

Каталоги `android/` и `ios/` являются генерируемыми и не коммитятся. Конфигурация хранится в `app.json`; это исключает расхождение native-проекта и EAS Build. Мобильный клиент привязан к отдельному EAS-проекту `@escalion/artistcrm`.

```bash
npm run release:prebuild
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform android --profile production-apk
```

Профиль `production` собирает AAB для Google Play, а `production-apk` — подписанный APK для прямой установки. Оба профиля используют `ru.escalion.artistcrm` и автоматически увеличивают `versionCode`. Публичные production-переменные задаются в `eas.json`/EAS environment, секреты провайдеров остаются только на сервере.

## Структура

- `app/` — маршруты Expo Router;
- `src/features/` — пользовательские сценарии;
- `src/shared/api/` — API-клиент с единым refresh;
- `src/shared/auth/` — сессия и SecureStore;
- `src/shared/storage/` — SQLCipher и зашифрованные файлы;
- `src/shared/sync/` — pull/push, outbox, конфликты и background sync;
- `src/shared/notifications/` — push, token lifecycle и быстрые действия;
- `maestro/` — device E2E-сценарии;
- `scripts/validate-release.mjs` — release gate конфигурации.

Подробности: `../docs/MOBILE_APP_ARCHITECTURE.md`, `../docs/ANDROID_RELEASE_CHECKLIST.md` и `../docs/ROADMAP.md`.
