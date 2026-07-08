# First Run Wizard And Statuses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented first-run setup with one modal wizard, rename the user-facing `active` status label to `Подтверждено`, and gate existing colleague-transfer controls behind a user setting.

**Architecture:** Keep database/API event status values unchanged (`draft`, `active`, `canceled`, `closed`) and change only UI labels and onboarding education copy. Move first-run decisions into small pure helpers, reuse the existing modal system and existing CRUD actions, and preserve existing `isTransferred/colleagueId` values when the new setting hides transfer controls.

**Tech Stack:** Next.js App Router, React client components, Jotai atoms, existing modal framework in `layouts/modals`, Mongo-backed settings through `POST /api/site`, Node built-in test runner, ESLint.

---

## File Structure

- Create `helpers/firstRunWizard.mjs`: pure custom-setting keys, first-run open decision, colleague-transfer visibility helper, site custom patch builder, status education copy.
- Create `helpers/firstRunWizard.test.mjs`: focused tests for first-run open logic, custom patch merging, status labels, and colleague-transfer visibility.
- Modify `helpers/onboardingPresets.mjs`: update `getStatusEducationItems()` so `active` is titled `Подтверждено`.
- Modify `helpers/onboardingPresets.test.mjs`: assert `active` title is `Подтверждено`.
- Replace `layouts/modals/modalsFunc/userOnboardingFunc.js`: turn the old one-screen profile modal into a multi-step first-run wizard modal.
- Modify `layouts/modals/modalsFuncGenerator.js`: keep `user.onboarding()` as compatibility alias, add `user.firstRunWizard()`.
- Modify `components/StateLoader.js`: remove automatic `ReleaseOnboardingCoach`, open the new wizard based on `firstRunWizardCompleted` and manual show token.
- Delete `components/ReleaseOnboardingCoach.js` after no imports remain.
- Modify `layouts/content/SettingsContent.js`: add the `Иногда передаю заказы коллеге` checkbox and change manual wizard restart to the new `firstRunWizardShowToken`.
- Modify `layouts/modals/modalsFunc/eventFunc.js`: hide existing `Передано коллеге` and `ColleaguePicker` unless the setting is enabled, while preserving stored values when hidden.
- Modify status-label files: `helpers/constants.js`, `components/GoogleCalendarSettings.js`, `layouts/content/EventsContent.js`, `layouts/modals/modalsFunc/eventFunc.js`, `layouts/modals/modalsFunc/eventViewFunc.js`, `layouts/cards/EventCard.js`, and any additional user-facing status-label occurrences found by the verification `rg`.
- Modify `docs/ROADMAP.md`: add a changelog entry for the first-run wizard replacement and status copy update.
- Modify `package.json`: patch bump `1.4.8` to `1.4.9` for the UX release.

## Task 1: First-Run Helper And Tests

**Files:**
- Create: `helpers/firstRunWizard.mjs`
- Create: `helpers/firstRunWizard.test.mjs`
- Modify: `helpers/onboardingPresets.mjs`
- Modify: `helpers/onboardingPresets.test.mjs`

- [ ] **Step 1: Write the failing helper tests**

Create `helpers/firstRunWizard.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FIRST_RUN_WIZARD_COMPLETED_KEY,
  FIRST_RUN_WIZARD_SHOW_TOKEN_KEY,
  SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY,
  buildFirstRunCompletionCustomPatch,
  getFirstRunStatusEducationItems,
  shouldOpenFirstRunWizard,
  shouldShowColleagueTransferControls,
} from './firstRunWizard.mjs'

test('opens first-run wizard for logged user until completed', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: { _id: 'user-1' },
      siteSettings: { custom: {} },
      alreadyShown: false,
    }),
    true
  )
})

test('does not open first-run wizard after completion without manual token', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: { _id: 'user-1' },
      siteSettings: { custom: { [FIRST_RUN_WIZARD_COMPLETED_KEY]: true } },
      alreadyShown: false,
    }),
    false
  )
})

test('manual token opens wizard even when completed', () => {
  assert.equal(
    shouldOpenFirstRunWizard({
      loggedUser: { _id: 'user-1' },
      siteSettings: {
        custom: {
          [FIRST_RUN_WIZARD_COMPLETED_KEY]: true,
          [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: 123,
        },
      },
      alreadyShown: false,
    }),
    true
  )
})

test('completion patch preserves custom values and clears manual token', () => {
  assert.deepEqual(
    buildFirstRunCompletionCustomPatch({
      existing: { onboardingActivityPreset: 'events', oldKey: true },
    }),
    {
      onboardingActivityPreset: 'events',
      oldKey: true,
      [FIRST_RUN_WIZARD_COMPLETED_KEY]: true,
      [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: null,
    }
  )
})

test('colleague-transfer controls are hidden by default and visible by setting', () => {
  assert.equal(shouldShowColleagueTransferControls({ custom: {} }), false)
  assert.equal(
    shouldShowColleagueTransferControls({
      custom: { [SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY]: true },
    }),
    true
  )
})

test('status education uses confirmed label for active status', () => {
  const items = getFirstRunStatusEducationItems()
  assert.deepEqual(
    items.map((item) => item.status),
    ['draft', 'active', 'canceled', 'closed']
  )
  assert.equal(items.find((item) => item.status === 'active')?.title, 'Подтверждено')
})
```

Update `helpers/onboardingPresets.test.mjs` in `status education explains all canonical statuses`:

```js
  assert.deepEqual(
    items.map((item) => item.status),
    ['draft', 'active', 'closed', 'canceled']
  )
  assert.equal(items.find((item) => item.status === 'active')?.title, 'Подтверждено')
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test helpers/firstRunWizard.test.mjs helpers/onboardingPresets.test.mjs
```

Expected: `helpers/firstRunWizard.mjs` import fails, and the onboarding preset test still expects the old `active` title.

- [ ] **Step 3: Implement the helper**

Create `helpers/firstRunWizard.mjs`:

```js
export const FIRST_RUN_WIZARD_COMPLETED_KEY = 'firstRunWizardCompleted'
export const FIRST_RUN_WIZARD_SHOW_TOKEN_KEY = 'firstRunWizardShowToken'
export const SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY =
  'showColleagueTransferFields'

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

export const shouldOpenFirstRunWizard = ({
  loggedUser,
  siteSettings,
  alreadyShown = false,
} = {}) => {
  if (!loggedUser?._id || alreadyShown) return false
  const custom = siteSettings?.custom ?? {}
  const manualToken = getCustomValue(custom, FIRST_RUN_WIZARD_SHOW_TOKEN_KEY)
  if (manualToken) return true
  return getCustomValue(custom, FIRST_RUN_WIZARD_COMPLETED_KEY) !== true
}

export const buildFirstRunCompletionCustomPatch = ({ existing = {} } = {}) => ({
  ...(existing ?? {}),
  [FIRST_RUN_WIZARD_COMPLETED_KEY]: true,
  [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: null,
})

export const shouldShowColleagueTransferControls = (siteSettings) =>
  getCustomValue(
    siteSettings?.custom,
    SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY
  ) === true

export const getFirstRunStatusEducationItems = () => [
  {
    status: 'draft',
    title: 'Заявка',
    description:
      'Клиент проявил интерес, но заказ еще не подтвержден. Главная задача: поставить следующий контакт.',
  },
  {
    status: 'active',
    title: 'Подтверждено',
    description:
      'Клиент подтвердил заказ, дату или условия. Теперь карточку нужно вести по оплатам, задачам, документам и календарю.',
  },
  {
    status: 'canceled',
    title: 'Отменено',
    description:
      'Заказ не состоялся и не должен считаться активной работой.',
  },
  {
    status: 'closed',
    title: 'Закрыто',
    description:
      'Работа завершена, оплаты и документы доведены до конца. Закрытая карточка больше не требует действий.',
  },
]
```

Update `helpers/onboardingPresets.mjs` inside `getStatusEducationItems()`:

```js
    {
      status: 'active',
      title: 'Подтверждено',
      description: `Клиент подтвердил ${confirmedWord}, дату или условия. Теперь это работа, которую нужно вести в календаре, финансах и документах.`,
    },
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
node --test helpers/firstRunWizard.test.mjs helpers/onboardingPresets.test.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Commit helper changes**

Run:

```bash
git add helpers/firstRunWizard.mjs helpers/firstRunWizard.test.mjs helpers/onboardingPresets.mjs helpers/onboardingPresets.test.mjs
git commit -m "test: cover first run wizard decisions"
```

## Task 2: First-Run Wizard Modal

**Files:**
- Modify: `layouts/modals/modalsFunc/userOnboardingFunc.js`
- Modify: `layouts/modals/modalsFuncGenerator.js`

- [ ] **Step 1: Replace the old one-screen onboarding modal with a multi-step wizard**

In `layouts/modals/modalsFunc/userOnboardingFunc.js`, keep the filename for compatibility but replace the modal content with `FirstRunWizardModal`. Reuse existing imports for `ComboBox`, `FormWrapper`, `Input`, `postData`, `itemsFuncAtom`, `loggedUserAtom`, `siteSettingsAtom`, `useAtom`, `useAtomValue`, and add:

```js
import IconCheckBox from '@components/IconCheckBox'
import Textarea from '@components/Textarea'
import servicesAtom from '@state/atoms/servicesAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import { useSetAtom } from 'jotai'
import useSnackbar from '@helpers/useSnackbar'
import {
  ONBOARDING_ACTIVITY_PRESETS,
  buildDemoEventPayload,
  getOnboardingPreset,
  getStarterServicesForPreset,
} from '@helpers/onboardingPresets.mjs'
import {
  FIRST_RUN_WIZARD_SHOW_TOKEN_KEY,
  SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY,
  buildFirstRunCompletionCustomPatch,
  getFirstRunStatusEducationItems,
} from '@helpers/firstRunWizard.mjs'
```

Use these local constants:

```js
const ACTIVITY_PRESET_KEY = 'onboardingActivityPreset'
const STARTER_SERVICES_CREATED_KEY = 'onboardingStarterServicesCreated'
const STARTER_SERVICES_MANUAL_KEY = 'onboardingStarterServicesManual'
const DEMO_EVENT_CREATED_KEY = 'onboardingDemoEventCreated'
const DEMO_EVENT_SKIPPED_KEY = 'onboardingDemoEventSkipped'

const STEPS = Object.freeze([
  'profile',
  'environment',
  'specialization',
  'transfer',
  'statuses',
  'finish',
])
```

Build the wizard as a controlled modal:

- `profile`: photo placeholder text, first name, second name, phone, WhatsApp/Telegram if fields exist in `loggedUser`; save through `itemsFunc.user.set`.
- `environment`: light/dark theme, city, timezone; save via `POST /api/site`; set `timeZoneConfirmed: true`.
- `specialization`: activity preset buttons, service recommendations, create starter services only when `services.length === 0`; if services exist, show the warning: `Вижу, что у вас уже есть созданные услуги. Создание новых услуг из пресета может испортить структуру, поэтому лучше добавьте услуги вручную.`
- `transfer`: question `Бывает, что передаете заказ коллеге?`; when yes, save `showColleagueTransferFields: true`; when no, save `false`; explain that the editor will show/hide `Передано коллеге` and colleague selection.
- `statuses`: render `getFirstRunStatusEducationItems()` and a short path: `Заявка -> Подтверждено -> Закрыто`, with `Отменено` for lost orders.
- `finish`: thank the user, say all details are in settings, and optionally create a demo request through `buildDemoEventPayload()`.

Use modal footer buttons through `setOnConfirmFunc`, `setConfirmButtonName`, and `setDisableConfirm`:

```js
const isLastStep = stepIndex === STEPS.length - 1
setConfirmButtonName(isLastStep ? 'Завершить' : 'Далее')
setDisableConfirm(isSaving || !isStepValid)
setOnConfirmFunc(() => async () => {
  const saved = await saveCurrentStep()
  if (!saved) return
  if (isLastStep) {
    await completeWizard()
    closeModal()
    return
  }
  setStepIndex((value) => Math.min(value + 1, STEPS.length - 1))
})
```

The `completeWizard()` implementation must save:

```js
await postData(
  '/api/site',
  {
    custom: buildFirstRunCompletionCustomPatch({
      existing: siteSettings?.custom ?? {},
    }),
  },
  (data) => setSiteSettings(data),
  null,
  false,
  null
)
```

The demo request creation copy must state that the request has no event date:

```js
const demoText =
  'Учебная заявка создается без даты мероприятия: это еще не подтвержденный заказ. Следующее действие будет поставлено на завтра в 12:00.'
```

- [ ] **Step 2: Preserve starter-service safety**

Inside the service creation action, use this guard before creating preset services:

```js
if (Array.isArray(services) && services.length > 0) {
  snackbar.info(
    'Вижу, что у вас уже есть созданные услуги. Создание новых услуг из пресета может испортить структуру, поэтому лучше добавьте услуги вручную.'
  )
  await saveCustom({ [STARTER_SERVICES_MANUAL_KEY]: true })
  return
}
```

When services are created successfully, add them to `servicesAtom` and save:

```js
await saveCustom({ [STARTER_SERVICES_CREATED_KEY]: true })
```

- [ ] **Step 3: Add the modal generator alias**

In `layouts/modals/modalsFuncGenerator.js`, keep the existing import name and change the user group:

```js
      onboarding: () => addModal(userOnboardingFunc()),
      firstRunWizard: () => addModal(userOnboardingFunc()),
```

Expected: existing calls still work, but new code can call `modalFunc.user.firstRunWizard()`.

- [ ] **Step 4: Run lint on modal files**

Run:

```bash
npx eslint layouts/modals/modalsFunc/userOnboardingFunc.js layouts/modals/modalsFuncGenerator.js
```

Expected: no ESLint errors.

- [ ] **Step 5: Commit wizard modal**

Run:

```bash
git add layouts/modals/modalsFunc/userOnboardingFunc.js layouts/modals/modalsFuncGenerator.js
git commit -m "feat: add first run wizard modal"
```

## Task 3: Wire First-Run Launch And Remove Floating Coach

**Files:**
- Modify: `components/StateLoader.js`
- Delete: `components/ReleaseOnboardingCoach.js`

- [ ] **Step 1: Replace first-run launch logic**

In `components/StateLoader.js`, remove:

```js
import ReleaseOnboardingCoach from '@components/ReleaseOnboardingCoach'
```

Add:

```js
import { shouldOpenFirstRunWizard } from '@helpers/firstRunWizard.mjs'
```

Replace the current profile-only onboarding effect with:

```js
  useEffect(() => {
    const shouldOpen = shouldOpenFirstRunWizard({
      loggedUser,
      siteSettings: siteSettingsState,
      alreadyShown: onboardingShownRef.current,
    })

    if (shouldOpen && modalFunc?.user?.firstRunWizard) {
      onboardingShownRef.current = true
      modalFunc.user.firstRunWizard()
    }
  }, [
    loggedUser,
    siteSettingsState,
    siteSettingsState?.custom?.firstRunWizardCompleted,
    siteSettingsState?.custom?.firstRunWizardShowToken,
    modalFunc,
  ])
```

Remove the render line:

```jsx
      <ReleaseOnboardingCoach />
```

- [ ] **Step 2: Delete the old floating coach**

Delete `components/ReleaseOnboardingCoach.js`.

- [ ] **Step 3: Verify no imports remain**

Run:

```bash
rg -n "ReleaseOnboardingCoach|releaseOnboardingCompleted|releaseOnboardingShowToken" components layouts helpers app
```

Expected: no `ReleaseOnboardingCoach` imports. Legacy keys may remain only in old docs or migration comments; they must not control runtime UI.

- [ ] **Step 4: Run lint**

Run:

```bash
npx eslint components/StateLoader.js
```

Expected: no ESLint errors.

- [ ] **Step 5: Commit launch wiring**

Run:

```bash
git add components/StateLoader.js components/ReleaseOnboardingCoach.js
git commit -m "feat: replace floating onboarding coach"
```

## Task 4: Settings For Wizard Restart And Colleague Transfer

**Files:**
- Modify: `layouts/content/SettingsContent.js`

- [ ] **Step 1: Add first-run helper imports**

At the top of `layouts/content/SettingsContent.js`, add:

```js
import {
  FIRST_RUN_WIZARD_COMPLETED_KEY,
  FIRST_RUN_WIZARD_SHOW_TOKEN_KEY,
  SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY,
} from '@helpers/firstRunWizard.mjs'
```

- [ ] **Step 2: Add the colleague-transfer checkbox**

After the default duration setting and before the wizard block, add:

```jsx
        <LabeledContainer label="Передача заказов коллеге" noMargin>
          <div className="flex flex-col gap-2">
            <IconCheckBox
              checked={
                customSettings?.[SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY] === true
              }
              onClick={() =>
                saveSiteSettingsPatch({
                  custom: {
                    ...(siteSettingsState?.custom ?? {}),
                    [SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY]:
                      customSettings?.[SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY] !==
                      true,
                  },
                })
              }
              label="Иногда передаю заказ коллеге"
              checkedIconColor={checkBoxColors.checked}
            />
            <MutedText className="text-gray-500">
              Если включено, в редакторе заявки появятся поля «Передано
              коллеге» и выбор коллеги. Если выключено, эти поля скрыты и
              новые карточки ведутся как ваши собственные заказы.
            </MutedText>
          </div>
        </LabeledContainer>
```

- [ ] **Step 3: Repoint manual wizard restart**

In the `Мастер запуска` block, replace old custom keys with:

```js
custom: {
  ...(siteSettingsState?.custom ?? {}),
  [FIRST_RUN_WIZARD_COMPLETED_KEY]: false,
  [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: Date.now(),
},
```

Change the helper text to:

```jsx
Снова откройте мастер первого запуска, чтобы обновить профиль, город, специализацию, услуги и подсказки по статусам.
```

- [ ] **Step 4: Run lint**

Run:

```bash
npx eslint layouts/content/SettingsContent.js
```

Expected: no ESLint errors.

- [ ] **Step 5: Commit settings changes**

Run:

```bash
git add layouts/content/SettingsContent.js
git commit -m "feat: add first run and transfer settings"
```

## Task 5: Hide Colleague Transfer Controls In Event Editor

**Files:**
- Modify: `layouts/modals/modalsFunc/eventFunc.js`

- [ ] **Step 1: Import visibility helper**

Add to `layouts/modals/modalsFunc/eventFunc.js`:

```js
import { shouldShowColleagueTransferControls } from '@helpers/firstRunWizard.mjs'
```

- [ ] **Step 2: Compute visibility from site settings**

After `const isDraft = status === 'draft'`, add:

```js
    const showColleagueTransferControls =
      shouldShowColleagueTransferControls(siteSettings)
```

- [ ] **Step 3: Keep hidden existing transfer values during save**

Inside `buildEventSaveContext`, before `const payload = {`, add:

```js
      const effectiveIsTransferred = showColleagueTransferControls
        ? isTransferred
        : Boolean(initialEventValues.isTransferred)
      const effectiveColleagueId = showColleagueTransferControls
        ? isTransferred
          ? colleagueId
          : null
        : (initialEventValues.colleagueId ?? null)
```

Then replace payload transfer fields with:

```js
        isTransferred: effectiveIsTransferred,
        colleagueId: effectiveIsTransferred ? effectiveColleagueId : null,
```

Add `showColleagueTransferControls` and `initialEventValues` to the `buildEventSaveContext` dependency array.

- [ ] **Step 4: Skip colleague validation while controls are hidden**

In `missingFields`, replace:

```js
      if (isTransferred && !colleagueId) fields.push('Коллега')
```

with:

```js
      if (showColleagueTransferControls && isTransferred && !colleagueId) {
        fields.push('Коллега')
      }
```

Add `showColleagueTransferControls` to its dependency array.

In the explicit validation block around the existing `addErrorRef.current({ colleagueId: 'Выберите коллегу' })`, wrap the condition:

```js
      if (showColleagueTransferControls && isTransferred && !colleagueId) {
```

Add `showColleagueTransferControls` to that callback dependency array.

- [ ] **Step 5: Hide the controls in JSX**

Wrap the existing `IconCheckBox` and `ColleaguePicker` block:

```jsx
              {showColleagueTransferControls && (
                <>
                  <IconCheckBox
                    checked={isTransferred}
                    onClick={() => {
                      setIsTransferred((prev) => !prev)
                      removeError('colleagueId')
                    }}
                    label="Передано коллеге"
                    checkedIcon={faCircleCheck}
                    checkedIconColor="#F97316"
                  />
                  {isTransferred && (
                    <ColleaguePicker
                      selectedColleague={selectedColleague}
                      selectedColleagueId={colleagueId}
                      onSelectClick={openColleagueSelectModal}
                      label="Коллега"
                      required={isTransferred}
                      error={errors.colleagueId}
                      compact
                      paddingY
                      fullWidth
                    />
                  )}
                </>
              )}
```

- [ ] **Step 6: Run lint**

Run:

```bash
npx eslint layouts/modals/modalsFunc/eventFunc.js
```

Expected: no ESLint errors.

- [ ] **Step 7: Commit event editor setting**

Run:

```bash
git add layouts/modals/modalsFunc/eventFunc.js
git commit -m "feat: gate colleague transfer editor fields"
```

## Task 6: Rename User-Facing Active Status Label

**Files:**
- Modify: `helpers/constants.js`
- Modify: `components/GoogleCalendarSettings.js`
- Modify: `layouts/content/EventsContent.js`
- Modify: `layouts/modals/modalsFunc/eventFunc.js`
- Modify: `layouts/modals/modalsFunc/eventViewFunc.js`
- Modify: `layouts/cards/EventCard.js`

- [ ] **Step 1: Update central status constants**

In `helpers/constants.js`, change only `active` event status labels:

```js
export const EVENT_STATUSES_SIMPLE = Object.freeze([
  { value: 'draft', name: 'Заявка', color: 'gray' },
  { value: 'active', name: 'Подтверждено', color: 'blue' },
  { value: 'canceled', name: 'Отменено', color: 'red' },
  { value: 'closed', name: 'Закрыто', color: 'green' },
])
```

```js
export const EVENT_STATUSES = [
  { value: 'draft', name: 'Заявка', color: 'gray-400', icon: faClock },
  { value: 'active', name: 'Подтверждено', color: 'blue-400', icon: faPlay },
  { value: 'canceled', name: 'Отменено', color: 'red-400', icon: faBan },
  { value: 'closed', name: 'Закрыто', color: 'green-400', icon: faLock },
]
```

Do not change `SERVICE_USER_STATUSES` or `PRODUCT_USER_STATUSES`; their `active = Активно` is not an event status.

- [ ] **Step 2: Update local event status labels**

Change these exact event-status label occurrences:

- `components/GoogleCalendarSettings.js`: `{ key: 'active', label: 'Подтверждено' }`
- `layouts/content/EventsContent.js`: filter label for active status from `Мероприятие` to `Подтверждено`
- `layouts/modals/modalsFunc/eventFunc.js`: segmented status option `{ value: 'active', label: 'Подтверждено' }`
- `layouts/modals/modalsFunc/eventFunc.js`: draft finance warning text to `Переведите тип в "Подтверждено"`
- `layouts/modals/modalsFunc/eventViewFunc.js`: local status config label for `active` to `Подтверждено`
- `layouts/cards/EventCard.js`: active status `aria-label` from `Мероприятие` to `Подтверждено`

Keep neutral entity text such as `Мероприятие не найдено`, modal title `Мероприятие`, and transaction label `Мероприятие` unchanged.

- [ ] **Step 3: Verify no status-label misses**

Run:

```bash
rg -n "value: 'active'.*Мероприятие|key: 'active'.*Мероприятие|label: 'Мероприятие'|aria-label=\"Мероприятие\"" helpers components layouts app
```

Expected: no remaining `active` status labels as `Мероприятие`. Remaining `Мероприятие` matches must describe the entity, not the `active` status.

- [ ] **Step 4: Run lint**

Run:

```bash
npx eslint helpers/constants.js components/GoogleCalendarSettings.js layouts/content/EventsContent.js layouts/modals/modalsFunc/eventFunc.js layouts/modals/modalsFunc/eventViewFunc.js layouts/cards/EventCard.js
```

Expected: no ESLint errors.

- [ ] **Step 5: Commit status label changes**

Run:

```bash
git add helpers/constants.js components/GoogleCalendarSettings.js layouts/content/EventsContent.js layouts/modals/modalsFunc/eventFunc.js layouts/modals/modalsFunc/eventViewFunc.js layouts/cards/EventCard.js
git commit -m "copy: rename confirmed event status"
```

## Task 7: Roadmap, Version, And Final Verification

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `package.json`

- [ ] **Step 1: Add roadmap changelog entry**

In `docs/ROADMAP.md`, append this entry to `Журнал изменений плана` or the current changelog section used at the end of the file:

```markdown
- 2026-07-08: первый запуск заменен на единый модальный мастер настройки; пользовательский статус `active` переименован в `Подтверждено`; настройка передачи заказа коллеге вынесена в `Настройки`.
```

Do not mark a new roadmap checkbox complete unless a new explicit checkbox is added in the same change.

- [ ] **Step 2: Patch bump package version**

In `package.json`, change:

```json
"version": "1.4.8"
```

to:

```json
"version": "1.4.9"
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
node --test helpers/firstRunWizard.test.mjs helpers/onboardingPresets.test.mjs helpers/eventScopeQueries.test.mjs
```

Expected: all tests pass.

- [ ] **Step 4: Run focused lint**

Run:

```bash
npx eslint helpers/firstRunWizard.mjs helpers/firstRunWizard.test.mjs helpers/onboardingPresets.mjs helpers/onboardingPresets.test.mjs components/StateLoader.js layouts/content/SettingsContent.js layouts/modals/modalsFunc/userOnboardingFunc.js layouts/modals/modalsFuncGenerator.js layouts/modals/modalsFunc/eventFunc.js helpers/constants.js components/GoogleCalendarSettings.js layouts/content/EventsContent.js layouts/modals/modalsFunc/eventViewFunc.js layouts/cards/EventCard.js
```

Expected: no ESLint errors.

- [ ] **Step 5: Run browser smoke test**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL. Open the current local URL in the in-app browser and verify:

- New user with `siteSettings.custom.firstRunWizardCompleted !== true` sees one modal wizard immediately.
- Wizard step 1 saves profile fields.
- Wizard step 2 saves theme, city, and timezone.
- Wizard step 3 shows presets and refuses preset service creation when services already exist.
- Wizard step 4 toggles `showColleagueTransferFields`.
- Wizard status education says `Подтверждено`, not `Мероприятие`.
- Final step thanks the user and closes the modal.
- `Настройки` can launch the wizard again.
- With transfer setting off, event editor hides `Передано коллеге` and colleague picker.
- With transfer setting on, event editor shows both existing transfer controls.
- Existing transferred event keeps transfer display in card/view/statistics after saving while controls are hidden.
- Status filters and cards show `Подтверждено` for active events.

Stop the dev server before finishing.

- [ ] **Step 6: Commit docs and version**

Run:

```bash
git add docs/ROADMAP.md package.json
git commit -m "chore: release first run wizard updates"
```

## Self-Review

- Spec coverage: the plan replaces the first-run profile modal and floating coach with a single modal wizard, includes profile/theme/city/timezone/specialization/services/colleague-transfer/status education/final thanks, preserves existing transfer data, changes only user-facing `active` labels, and keeps API/DB status values unchanged.
- Placeholder scan: the plan contains no unresolved marker words, vague future placeholders, or open-ended implementation bullets. Steps include exact files, commands, expected results, and key code blocks.
- Type consistency: custom setting keys are defined once in `helpers/firstRunWizard.mjs`; later tasks import the same names. `firstRunWizardCompleted`, `firstRunWizardShowToken`, and `showColleagueTransferFields` are used consistently across StateLoader, Settings, wizard completion, and event editor visibility.
