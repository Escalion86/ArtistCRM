# New User Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clearer first-run onboarding flow that personalizes examples by activity preset, explains statuses and services, and optionally creates a demo request.

**Architecture:** Keep the existing profile modal and floating `ReleaseOnboardingCoach`, but move onboarding copy/preset/demo payloads into a focused pure helper. The coach remains the orchestrator: it stores progress in `siteSettings.custom`, creates starter services through existing service CRUD, and creates the optional demo request through existing event CRUD.

**Tech Stack:** Next.js App Router, React client components, Jotai atoms, existing `itemsFuncGenerator` CRUD actions, MongoDB/Mongoose APIs, Node built-in test runner for helper tests, targeted ESLint.

---

## File Structure

- Create `helpers/onboardingPresets.mjs`: pure activity preset definitions and helper functions for preset lookup, starter services, demo event payloads, status explanations, and progress checks.
- Create `helpers/onboardingPresets.test.mjs`: Node tests for preset fallback, starter service payloads, demo request payloads, and status explanations.
- Modify `components/ReleaseOnboardingCoach.js`: replace the current 4-step checklist with the new onboarding steps, activity preset selection, starter service creation, optional demo request creation, richer status/service explanations, and existing-user guards.
- Modify `layouts/modals/modalsFunc/userOnboardingFunc.js`: improve profile onboarding explanatory copy without changing saved fields.
- Modify `docs/ROADMAP.md`: mark the new-user onboarding/backlog item as complete and add a dated entry.
- Modify `package.json`: patch bump `1.4.7` to `1.4.8` because the roadmap item is closed.

## Task 1: Add Onboarding Preset Helper

**Files:**
- Create: `helpers/onboardingPresets.mjs`
- Test: `helpers/onboardingPresets.test.mjs`

- [ ] **Step 1: Write failing tests for presets and payloads**

Create `helpers/onboardingPresets.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ONBOARDING_ACTIVITY_PRESETS,
  getOnboardingPreset,
  getStarterServicesForPreset,
  buildDemoEventPayload,
  getStatusEducationItems,
} from './onboardingPresets.mjs'

test('returns events preset by key', () => {
  const preset = getOnboardingPreset('events')
  assert.equal(preset.key, 'events')
  assert.match(preset.title, /Мероприятия/)
  assert.ok(preset.starterServices.length >= 2)
})

test('falls back to other preset for unknown key', () => {
  const preset = getOnboardingPreset('unknown')
  assert.equal(preset.key, 'other')
})

test('starter services are safe service create payloads', () => {
  const services = getStarterServicesForPreset('custom_products')
  assert.deepEqual(
    services.map((service) => Object.keys(service).sort()),
    services.map(() =>
      ['description', 'duration', 'groupId', 'images', 'price', 'title'].sort()
    )
  )
  assert.equal(services[0].groupId, null)
  assert.equal(services[0].images.length, 0)
})

test('demo event payload uses draft status and selected services', () => {
  const payload = buildDemoEventPayload('beauty', ['service-1'])
  assert.equal(payload.status, 'draft')
  assert.equal(payload.servicesIds[0], 'service-1')
  assert.match(payload.eventType, /образ/i)
  assert.equal(payload.calendarImportChecked, false)
  assert.equal(payload.isTransferred, false)
  assert.equal(payload.additionalEvents.length, 1)
  assert.match(payload.additionalEvents[0].title, /Связаться|Уточнить/)
})

test('status education explains all canonical statuses', () => {
  const items = getStatusEducationItems('other')
  assert.deepEqual(
    items.map((item) => item.status),
    ['draft', 'active', 'closed', 'canceled']
  )
  assert.match(items[0].title, /Заявка/)
  assert.match(items[1].description, /подтвердил/)
  assert.match(items[2].description, /заверш/)
})

test('exports the agreed preset keys', () => {
  assert.deepEqual(
    ONBOARDING_ACTIVITY_PRESETS.map((preset) => preset.key),
    ['events', 'photo_video', 'custom_products', 'beauty', 'consulting', 'other']
  )
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test helpers/onboardingPresets.test.mjs
```

Expected: fail with `Cannot find module ... onboardingPresets.mjs`.

- [ ] **Step 3: Implement preset helper**

Create `helpers/onboardingPresets.mjs`:

```js
const emptyServiceBase = {
  description: '',
  images: [],
  duration: 0,
  price: 0,
  groupId: null,
}

export const ONBOARDING_ACTIVITY_PRESETS = Object.freeze([
  {
    key: 'events',
    title: 'Мероприятия и сцена',
    shortTitle: 'Мероприятия',
    description: 'Ведущий, артист, DJ, музыкант, группа, шоу-программа.',
    starterServices: [
      {
        title: 'Ведение мероприятия',
        description: 'Основная услуга для подтвержденного события.',
        duration: 240,
        price: 0,
      },
      {
        title: 'Выступление / шоу-программа',
        description: 'Отдельный номер, концерт или программа.',
        duration: 60,
        price: 0,
      },
      {
        title: 'DJ-сет / музыкальное сопровождение',
        description: 'Музыка, сет или сопровождение события.',
        duration: 180,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Корпоратив',
      description:
        'Учебная заявка: клиент уточняет дату, формат и стоимость. Пока заказ не подтвержден, это заявка.',
      nextActionTitle: 'Связаться с клиентом',
      nextActionDescription: 'Уточнить формат, площадку и решение по заказу.',
    },
  },
  {
    key: 'photo_video',
    title: 'Фото, видео, контент',
    shortTitle: 'Фото / видео',
    description: 'Фотограф, видеограф, контент-съемка.',
    starterServices: [
      {
        title: 'Фотосъемка 2 часа',
        description: 'Базовая съемка для частного события или контента.',
        duration: 120,
        price: 0,
      },
      {
        title: 'Видеосъемка',
        description: 'Съемка события, ролика или материала для соцсетей.',
        duration: 180,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Съемка дня рождения',
      description:
        'Учебная заявка: клиент спрашивает свободна ли дата, сколько стоит съемка и когда будет готов материал.',
      nextActionTitle: 'Уточнить детали съемки',
      nextActionDescription: 'Согласовать дату, место, длительность и формат результата.',
    },
  },
  {
    key: 'custom_products',
    title: 'Изделия и заказы',
    shortTitle: 'Изделия',
    description: 'Торты, декор, подарки, одежда, ручная работа.',
    starterServices: [
      {
        title: 'Торт на заказ',
        description: 'Индивидуальный заказ под дату клиента.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Набор / маленький заказ',
        description: 'Капкейки, подарочный набор или небольшой заказ.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Доставка',
        description: 'Отдельная услуга доставки или передачи заказа.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Торт на день рождения',
      description:
        'Учебная заявка: клиент уточняет дату, вес, начинку, оформление и стоимость.',
      nextActionTitle: 'Уточнить параметры заказа',
      nextActionDescription: 'Спросить вес, оформление, дату выдачи и нужен ли задаток.',
    },
  },
  {
    key: 'beauty',
    title: 'Красота и персональные услуги',
    shortTitle: 'Красота',
    description: 'Визаж, прически, стилист, мастер.',
    starterServices: [
      {
        title: 'Макияж',
        description: 'Базовая услуга для клиента.',
        duration: 90,
        price: 0,
      },
      {
        title: 'Укладка',
        description: 'Отдельная услуга или часть комплексного образа.',
        duration: 60,
        price: 0,
      },
      {
        title: 'Образ под ключ',
        description: 'Комплексная услуга для события или съемки.',
        duration: 150,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Образ для фотосессии',
      description:
        'Учебная заявка: клиент уточняет дату, время, место и состав услуги.',
      nextActionTitle: 'Согласовать образ',
      nextActionDescription: 'Уточнить время, место, референсы и подтверждение записи.',
    },
  },
  {
    key: 'consulting',
    title: 'Консультации и обучение',
    shortTitle: 'Консультации',
    description: 'Наставник, репетитор, тренер, консультант.',
    starterServices: [
      {
        title: 'Разовая консультация',
        description: 'Одна встреча или созвон по запросу клиента.',
        duration: 60,
        price: 0,
      },
      {
        title: 'Пакет занятий',
        description: 'Несколько встреч или уроков в одном заказе.',
        duration: 60,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Консультация клиента',
      description:
        'Учебная заявка: клиент описал задачу и выбирает удобное время для первой встречи.',
      nextActionTitle: 'Назначить время',
      nextActionDescription: 'Предложить слоты и уточнить формат встречи.',
    },
  },
  {
    key: 'other',
    title: 'Другое / настрою сам',
    shortTitle: 'Другое',
    description: 'Нейтральный пример для любой сферы.',
    starterServices: [
      {
        title: 'Основная услуга',
        description: 'Переименуйте под то, что чаще всего заказывают клиенты.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Заказ от клиента',
      description:
        'Учебная заявка: клиент заинтересовался услугой, но еще не подтвердил заказ.',
      nextActionTitle: 'Связаться с клиентом',
      nextActionDescription: 'Уточнить детали, стоимость и следующий шаг.',
    },
  },
])

const presetsByKey = new Map(
  ONBOARDING_ACTIVITY_PRESETS.map((preset) => [preset.key, preset])
)

export const getOnboardingPreset = (key) =>
  presetsByKey.get(key) || presetsByKey.get('other')

export const getStarterServicesForPreset = (key) =>
  getOnboardingPreset(key).starterServices.map((service) => ({
    ...emptyServiceBase,
    ...service,
    groupId: null,
    images: [],
  }))

export const buildDemoEventPayload = (key, serviceIds = []) => {
  const preset = getOnboardingPreset(key)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(12, 0, 0, 0)

  return {
    eventType: preset.demo.eventType,
    description: preset.demo.description,
    status: 'draft',
    servicesIds: serviceIds.filter(Boolean),
    requestCreatedAt: new Date().toISOString(),
    eventDate: null,
    dateEnd: null,
    contractSum: 0,
    waitDeposit: false,
    depositDueAt: null,
    depositExpectedAmount: null,
    isTransferred: false,
    isByContract: false,
    importedFromCalendar: false,
    calendarImportChecked: false,
    calendarSyncError: '',
    additionalEvents: [
      {
        title: preset.demo.nextActionTitle,
        description: preset.demo.nextActionDescription,
        date: tomorrow.toISOString(),
        done: false,
      },
    ],
  }
}

export const getStatusEducationItems = (key) => {
  const preset = getOnboardingPreset(key)
  const confirmedWord =
    preset.key === 'custom_products' || preset.key === 'other'
      ? 'заказ'
      : 'мероприятие'

  return [
    {
      status: 'draft',
      title: 'Заявка',
      description:
        'Клиент проявил интерес, но еще не подтвердил условия. На этом этапе важно поставить следующий контакт.',
    },
    {
      status: 'active',
      title: confirmedWord === 'заказ' ? 'Подтвержденный заказ' : 'Мероприятие',
      description: `Клиент подтвердил ${confirmedWord}, дату или условия. Теперь это работа, которую нужно вести в календаре, финансах и документах.`,
    },
    {
      status: 'closed',
      title: 'Закрыто',
      description:
        'Работа завершена, оплаты и документы доведены до конца. Закрытая карточка больше не требует действий.',
    },
    {
      status: 'canceled',
      title: 'Отменено',
      description:
        'Заказ не состоялся и не должен считаться активной работой.',
    },
  ]
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
node --test helpers/onboardingPresets.test.mjs
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit helper**

```bash
git add helpers/onboardingPresets.mjs helpers/onboardingPresets.test.mjs
git commit -m "feat: add onboarding activity presets"
```

## Task 2: Improve Profile Onboarding Copy

**Files:**
- Modify: `layouts/modals/modalsFunc/userOnboardingFunc.js`

- [ ] **Step 1: Update profile helper text**

In `layouts/modals/modalsFunc/userOnboardingFunc.js`, replace the current short intro:

```jsx
<div className="text-sm text-gray-600">
  Заполните обязательные данные для корректной работы системы.
</div>
```

with:

```jsx
<div className="flex flex-col gap-1 text-sm text-gray-600">
  <span>
    Эти данные нужны для корректных дат, напоминаний и документов.
  </span>
  <span>
    Город и часовой пояс помогут не ошибаться со временем заявок, событий и перезвонов.
  </span>
</div>
```

- [ ] **Step 2: Run targeted ESLint for the modified modal**

Run:

```bash
npx eslint layouts/modals/modalsFunc/userOnboardingFunc.js
```

Expected: no errors.

- [ ] **Step 3: Commit profile copy**

```bash
git add layouts/modals/modalsFunc/userOnboardingFunc.js
git commit -m "copy: clarify profile onboarding"
```

## Task 3: Rebuild Release Onboarding Steps

**Files:**
- Modify: `components/ReleaseOnboardingCoach.js`

- [ ] **Step 1: Add imports and custom keys**

At the top of `components/ReleaseOnboardingCoach.js`, add:

```js
import {
  ONBOARDING_ACTIVITY_PRESETS,
  buildDemoEventPayload,
  getOnboardingPreset,
  getStarterServicesForPreset,
  getStatusEducationItems,
} from '@helpers/onboardingPresets.mjs'
```

After `hasAdditionalEvents`, add:

```js
const ACTIVITY_PRESET_KEY = 'onboardingActivityPreset'
const STARTER_SERVICES_CREATED_KEY = 'onboardingStarterServicesCreated'
const DEMO_EVENT_CREATED_KEY = 'onboardingDemoEventCreated'
const DEMO_EVENT_SKIPPED_KEY = 'onboardingDemoEventSkipped'
const EDUCATION_DONE_KEY = 'onboardingEducationDone'
```

- [ ] **Step 2: Add local state for async onboarding actions**

Inside `ReleaseOnboardingCoach`, after existing `useState` calls, add:

```js
const [selectedPresetKey, setSelectedPresetKey] = useState(
  getCustomValue(siteSettings?.custom, ACTIVITY_PRESET_KEY) || ''
)
const [isSavingPreset, setIsSavingPreset] = useState(false)
const [isCreatingServices, setIsCreatingServices] = useState(false)
const [isCreatingDemoEvent, setIsCreatingDemoEvent] = useState(false)
```

Add existing CRUD access:

```js
const itemsFunc = useAtomValue(itemsFuncAtom)
```

and import `itemsFuncAtom`:

```js
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
```

- [ ] **Step 3: Add custom save helper**

Inside `ReleaseOnboardingCoach`, before `hideForcedMode`, add:

```js
const saveCustom = async (nextCustomPatch) =>
  postData(
    '/api/site',
    {
      custom: {
        ...(siteSettings?.custom ?? {}),
        ...nextCustomPatch,
      },
    },
    (data) => setSiteSettings(data),
    null,
    false,
    null
  )
```

- [ ] **Step 4: Add preset selection action**

Below `saveCustom`, add:

```js
const selectPreset = async (presetKey) => {
  setSelectedPresetKey(presetKey)
  setIsSavingPreset(true)
  try {
    await saveCustom({ [ACTIVITY_PRESET_KEY]: presetKey })
  } catch (error) {
    snackbar.error('Не удалось сохранить вид деятельности')
  } finally {
    setIsSavingPreset(false)
  }
}
```

- [ ] **Step 5: Add starter services creation action**

Below `selectPreset`, add:

```js
const createStarterServices = async () => {
  const presetKey = selectedPresetKey || getCustomValue(custom, ACTIVITY_PRESET_KEY)
  const starterServices = getStarterServicesForPreset(presetKey)
  if (!itemsFunc?.service?.set || starterServices.length === 0) return

  setIsCreatingServices(true)
  try {
    const createdServices = []
    for (const service of starterServices) {
      const created = await itemsFunc.service.set(service, false, true)
      if (created?._id) createdServices.push(created)
    }
    if (createdServices.length > 0) {
      setServices((prev) => {
        const existingIds = new Set((prev ?? []).map((item) => item?._id))
        return [
          ...(prev ?? []),
          ...createdServices.filter((item) => !existingIds.has(item._id)),
        ]
      })
      snackbar.success('Стартовые услуги созданы')
      await saveCustom({ [STARTER_SERVICES_CREATED_KEY]: true })
    } else {
      snackbar.error('Не удалось создать стартовые услуги')
    }
  } catch (error) {
    snackbar.error('Не удалось создать стартовые услуги')
  } finally {
    setIsCreatingServices(false)
  }
}
```

- [ ] **Step 6: Add education and demo actions**

Below `createStarterServices`, add:

```js
const markEducationDone = async () => {
  await saveCustom({ [EDUCATION_DONE_KEY]: true })
}

const skipDemoEvent = async () => {
  await saveCustom({ [DEMO_EVENT_SKIPPED_KEY]: true })
}

const createDemoEvent = async () => {
  const presetKey = selectedPresetKey || getCustomValue(custom, ACTIVITY_PRESET_KEY)
  const serviceIds = Array.isArray(services)
    ? services.slice(0, 2).map((service) => service?._id).filter(Boolean)
    : []
  const payload = buildDemoEventPayload(presetKey, serviceIds)
  if (!itemsFunc?.event?.set) return

  setIsCreatingDemoEvent(true)
  try {
    const created = await itemsFunc.event.set(payload, false, true)
    if (created?._id) {
      snackbar.success('Учебная заявка создана')
      await saveCustom({ [DEMO_EVENT_CREATED_KEY]: true })
      router.push('/cabinet/eventsUpcoming')
    } else {
      snackbar.error('Не удалось создать учебную заявку')
    }
  } catch (error) {
    snackbar.error('Не удалось создать учебную заявку')
  } finally {
    setIsCreatingDemoEvent(false)
  }
}
```

- [ ] **Step 7: Replace the `steps` array**

Replace the existing `steps = useMemo(() => [...])` block with:

```js
const selectedPreset = getOnboardingPreset(
  selectedPresetKey || getCustomValue(custom, ACTIVITY_PRESET_KEY)
)
const starterServicesCreated =
  getCustomValue(custom, STARTER_SERVICES_CREATED_KEY) === true
const demoEventCreated =
  getCustomValue(custom, DEMO_EVENT_CREATED_KEY) === true
const demoEventSkipped =
  getCustomValue(custom, DEMO_EVENT_SKIPPED_KEY) === true
const educationDone = getCustomValue(custom, EDUCATION_DONE_KEY) === true
const hasAnyEvent = Array.isArray(events) && events.length > 0

const steps = useMemo(
  () => [
    {
      id: 'activity',
      title: 'Выберите вид деятельности',
      description:
        'Так мастер подберет понятные примеры услуг, заявок и следующих действий.',
      done: Boolean(selectedPresetKey || getCustomValue(custom, ACTIVITY_PRESET_KEY)),
      renderContent: () => (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {ONBOARDING_ACTIVITY_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.key}
              disabled={isSavingPreset}
              onClick={() => selectPreset(preset.key)}
              className={cn(
                'cursor-pointer rounded border px-3 py-2 text-left text-sm transition hover:border-general',
                selectedPreset.key === preset.key
                  ? 'border-general bg-general/10 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-700'
              )}
            >
              <span className="font-semibold">{preset.title}</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'services',
      title: 'Настройте стартовые услуги',
      description:
        'Начните с 1-3 основных услуг. Группы можно добавить позже, когда список станет большим.',
      done:
        (Array.isArray(services) && services.length > 0) ||
        starterServicesCreated,
      actionText: isCreatingServices ? 'Создаем...' : 'Создать услуги из пресета',
      onAction: createStarterServices,
      secondaryActionText: 'Добавить вручную',
      onSecondaryAction: () => modalsFunc?.service?.add?.(),
      renderContent: () => (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Группа - это полка, услуга - конкретное предложение. Если услуг мало,
          оставьте их без группы.
        </div>
      ),
    },
    {
      id: 'statuses',
      title: 'Разберитесь со статусами',
      description:
        'Статусы показывают путь клиента: интерес, подтверждение, завершение или отмена.',
      done: educationDone,
      actionText: 'Понятно',
      onAction: markEducationDone,
      renderContent: () => (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {getStatusEducationItems(selectedPreset.key).map((item) => (
            <div
              key={item.status}
              className="rounded-md border border-gray-200 bg-white px-3 py-2"
            >
              <div className="text-sm font-semibold text-gray-900">
                {item.title}
              </div>
              <div className="mt-0.5 text-xs text-gray-600">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'demo',
      title: 'Создайте учебную заявку',
      description:
        'Учебная заявка покажет, когда ее переводить в мероприятие или подтвержденный заказ, а когда закрывать.',
      done: hasAnyEvent || demoEventCreated || demoEventSkipped,
      actionText: isCreatingDemoEvent ? 'Создаем...' : 'Создать учебную заявку',
      onAction: createDemoEvent,
      secondaryActionText: 'Пропустить',
      onSecondaryAction: skipDemoEvent,
    },
    {
      id: 'additional',
      title: 'Поставьте следующий контакт',
      description:
        'У каждой новой заявки должен быть следующий шаг: перезвонить, уточнить решение, получить задаток или подготовить договор.',
      done: hasAdditionalEvents(events),
      actionText: 'Открыть мероприятия',
      onAction: () => router.push('/cabinet/eventsUpcoming'),
    },
  ],
  [
    custom,
    demoEventCreated,
    demoEventSkipped,
    educationDone,
    events,
    hasAnyEvent,
    isCreatingDemoEvent,
    isCreatingServices,
    isSavingPreset,
    modalsFunc,
    router,
    selectedPreset.key,
    selectedPresetKey,
    services,
    starterServicesCreated,
  ]
)
```

- [ ] **Step 8: Render custom content and secondary buttons**

In the JSX after the step description:

```jsx
<div className="mt-1 text-sm text-gray-600">{viewedStep.description}</div>
```

add:

```jsx
{typeof viewedStep.renderContent === 'function'
  ? viewedStep.renderContent()
  : null}
```

In the button row, replace the unconditional primary action button with:

```jsx
{viewedStep.actionText && typeof viewedStep.onAction === 'function' ? (
  <button
    type="button"
    onClick={viewedStep.onAction}
    className="action-icon-button action-icon-button--warning inline-flex h-9 items-center justify-center rounded px-3 text-sm font-semibold"
  >
    {viewedStep.actionText}
  </button>
) : null}
{viewedStep.secondaryActionText &&
typeof viewedStep.onSecondaryAction === 'function' ? (
  <button
    type="button"
    onClick={viewedStep.onSecondaryAction}
    className="action-icon-button action-icon-button--neutral inline-flex h-9 items-center justify-center rounded px-3 text-sm font-semibold"
  >
    {viewedStep.secondaryActionText}
  </button>
) : null}
```

- [ ] **Step 9: Run ESLint**

Run:

```bash
npx eslint components/ReleaseOnboardingCoach.js
```

Expected: no errors. If `react-hooks/exhaustive-deps` requests stable callbacks, wrap `saveCustom`, `selectPreset`, `createStarterServices`, `markEducationDone`, `skipDemoEvent`, and `createDemoEvent` in `useCallback` and include the exact dependencies reported by ESLint.

- [ ] **Step 10: Commit coach rebuild**

```bash
git add components/ReleaseOnboardingCoach.js
git commit -m "feat: expand release onboarding coach"
```

## Task 4: Add Manual Deletion Guidance For Demo Requests

**Files:**
- Modify: `components/ReleaseOnboardingCoach.js`

- [ ] **Step 1: Add explicit demo deletion copy**

In the `demo` step description from Task 3, replace:

```js
description:
  'Учебная заявка покажет, когда ее переводить в мероприятие или подтвержденный заказ, а когда закрывать.',
```

with:

```js
description:
  'Учебная заявка покажет путь от интереса клиента до закрытия. Если пример не нужен, удалите его из списка мероприятий через меню карточки.',
```

- [ ] **Step 2: Run ESLint**

Run:

```bash
npx eslint components/ReleaseOnboardingCoach.js
```

Expected: no errors.

- [ ] **Step 3: Commit deletion guidance**

```bash
git add components/ReleaseOnboardingCoach.js
git commit -m "copy: explain demo request cleanup"
```

## Task 5: Update Roadmap And Version

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `package.json`

- [ ] **Step 1: Mark the onboarding backlog item complete**

In `docs/ROADMAP.md`, change:

```md
- [ ] Обучающие материалы и сценарий первого входа для новых пользователей
```

to:

```md
- [x] Обучающие материалы и сценарий первого входа для новых пользователей
```

- [ ] **Step 2: Add a dated completion entry**

In the `Выполнено` or `Журнал изменений плана` section, add:

```md
- 2026-07-05: улучшен сценарий первого входа для новых пользователей: добавлены пресеты деятельности, стартовые услуги из пресета, объяснение статусов, необязательная учебная заявка и подсказка по следующему контакту.
```

- [ ] **Step 3: Patch bump package version**

In `package.json`, change:

```json
"version": "1.4.7",
```

to:

```json
"version": "1.4.8",
```

- [ ] **Step 4: Commit roadmap and version**

```bash
git add docs/ROADMAP.md package.json
git commit -m "chore: mark onboarding roadmap complete"
```

## Task 6: Final Verification

**Files:**
- Verify: `helpers/onboardingPresets.test.mjs`
- Verify: `components/ReleaseOnboardingCoach.js`
- Verify: `layouts/modals/modalsFunc/userOnboardingFunc.js`

- [ ] **Step 1: Run helper tests**

Run:

```bash
node --test helpers/onboardingPresets.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run targeted ESLint**

Run:

```bash
npx eslint helpers/onboardingPresets.mjs helpers/onboardingPresets.test.mjs components/ReleaseOnboardingCoach.js layouts/modals/modalsFunc/userOnboardingFunc.js
```

Expected: no errors.

- [ ] **Step 3: Run development smoke check**

Run:

```bash
npm run dev
```

Expected: Next.js starts without compile errors. Open `/cabinet` with a user whose profile onboarding is complete and `siteSettings.custom.releaseOnboardingCompleted` is false. Verify:

- activity preset step appears first;
- selecting a preset saves and advances;
- starter services can be created;
- statuses render with four explanations;
- demo request can be skipped;
- demo request can be created when not skipped;
- next-contact step points to events;
- mobile width keeps the coach readable and buttons do not overflow.

- [ ] **Step 4: Stop dev server**

Press `Ctrl+C` in the dev server terminal.

- [ ] **Step 5: Commit any verification fixes**

If verification required fixes, commit them:

```bash
git add helpers/onboardingPresets.mjs helpers/onboardingPresets.test.mjs components/ReleaseOnboardingCoach.js layouts/modals/modalsFunc/userOnboardingFunc.js docs/ROADMAP.md package.json
git commit -m "fix: polish onboarding verification issues"
```

If no fixes were needed, do not create an empty commit.
