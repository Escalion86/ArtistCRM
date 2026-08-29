import ComboBox from '@components/ComboBox'
import FormWrapper from '@components/FormWrapper'
import IconCheckBox from '@components/IconCheckBox'
import Input from '@components/Input'
import InputImages from '@components/InputImages'
import Notice from '@components/Notice'
import PhoneInput from '@components/PhoneInput'
import { getData, postData } from '@helpers/CRUD'
import {
  ONBOARDING_ACTIVITY_PRESETS,
  buildDemoEventPayload,
  getOnboardingPreset,
  getStarterServicesForPreset,
} from '@helpers/onboardingPresets.mjs'
import {
  SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY,
  buildFirstRunCompletionCustomPatch,
  getFirstRunStatusEducationItems,
} from '@helpers/firstRunWizard.mjs'
import { reachGoalOnce } from '@helpers/metrikaGoals'
import { normalizeTelegramInput } from '@helpers/socialInput'
import { normalizeTelegramCommunityUrl } from '@helpers/onboardingCommunity.mjs'
import useSnackbar from '@helpers/useSnackbar'
import eventsAtom from '@state/atoms/eventsAtom'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import servicesAtom from '@state/atoms/servicesAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import cn from 'classnames'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'

const TIME_ZONE_OPTIONS = [
  { value: 'UTC', name: 'UTC' },
  { value: 'Europe/Kaliningrad', name: 'UTC+02 Калининград' },
  { value: 'Europe/Moscow', name: 'UTC+03 Москва' },
  { value: 'Europe/Samara', name: 'UTC+04 Самара' },
  { value: 'Asia/Yekaterinburg', name: 'UTC+05 Екатеринбург' },
  { value: 'Asia/Omsk', name: 'UTC+06 Омск' },
  { value: 'Asia/Krasnoyarsk', name: 'UTC+07 Красноярск' },
  { value: 'Asia/Irkutsk', name: 'UTC+08 Иркутск' },
  { value: 'Asia/Yakutsk', name: 'UTC+09 Якутск' },
  { value: 'Asia/Vladivostok', name: 'UTC+10 Владивосток' },
  { value: 'Asia/Magadan', name: 'UTC+11 Магадан' },
  { value: 'Asia/Kamchatka', name: 'UTC+12 Камчатка' },
]

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

const STEP_META = Object.freeze({
  profile: {
    title: 'Профиль',
    description: 'Контакты попадут в документы, напоминания и карточку профиля.',
  },
  environment: {
    title: 'Тема и время',
    description: 'Город и часовой пояс нужны для корректных дат и напоминаний.',
  },
  specialization: {
    title: 'Специализация и услуги',
    description: 'Выберите сферу, чтобы получить подходящие примеры услуг.',
  },
  transfer: {
    title: 'Передача коллеге',
    description: 'Настройка включает или скрывает поля передачи заказа.',
  },
  statuses: {
    title: 'Статусы заявок',
    description: 'Коротко о пути карточки от интереса до завершения.',
  },
  finish: {
    title: 'Готово',
    description: 'Мастер можно открыть снова в настройках.',
  },
})

const normalizeTowns = (towns = []) =>
  Array.from(
    new Set(
      towns
        .map((town) => (typeof town === 'string' ? town.trim() : ''))
        .filter(Boolean)
    )
  )

const normalizePhoneValue = (value) =>
  value ? String(value).replace(/[^\d]/g, '') : ''

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const getDetectedTimeZone = () => {
  if (typeof Intl === 'undefined') return ''
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch (error) {
    return ''
  }
}

const mergeCustom = (siteSettings, patch) => ({
  ...(siteSettings?.custom ?? {}),
  ...(patch ?? {}),
})

const userOnboardingFunc = () => {
  const FirstRunWizardModal = ({
    closeModal,
    setOnConfirmFunc,
    setDisableConfirm,
    setConfirmButtonName,
    setDeclineButtonShow,
    setCloseButtonShow,
    setTitle,
  }) => {
    const snackbar = useSnackbar()
    const [loggedUser, setLoggedUser] = useAtom(loggedUserAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    const [services, setServices] = useAtom(servicesAtom)
    const events = useAtomValue(eventsAtom)
    const setEvents = useSetAtom(eventsAtom)
    const itemsFunc = useAtomValue(itemsFuncAtom)

    const detectedTimeZone = useMemo(() => getDetectedTimeZone(), [])
    const timeZoneOptions = useMemo(() => {
      if (!detectedTimeZone) return TIME_ZONE_OPTIONS
      const exists = TIME_ZONE_OPTIONS.some(
        (item) => item.value === detectedTimeZone
      )
      if (exists) return TIME_ZONE_OPTIONS
      return [
        { value: detectedTimeZone, name: detectedTimeZone },
        ...TIME_ZONE_OPTIONS,
      ]
    }, [detectedTimeZone])

    const custom = siteSettings?.custom ?? {}
    const storedPresetKey =
      getCustomValue(custom, ACTIVITY_PRESET_KEY) || 'events'
    const storedTransferSetting =
      getCustomValue(custom, SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY) === true

    const [stepIndex, setStepIndex] = useState(0)
    const [firstName, setFirstName] = useState(loggedUser?.firstName ?? '')
    const [secondName, setSecondName] = useState(loggedUser?.secondName ?? '')
    const [thirdName, setThirdName] = useState(loggedUser?.thirdName ?? '')
    const [phone, setPhone] = useState(loggedUser?.phone ?? '')
    const [whatsapp, setWhatsapp] = useState(loggedUser?.whatsapp ?? null)
    const [telegram, setTelegram] = useState(loggedUser?.telegram ?? '')
    const [images, setImages] = useState(loggedUser?.images ?? [])
    const [town, setTown] = useState(siteSettings?.defaultTown ?? '')
    const [timeZone, setTimeZone] = useState(() => {
      const current = siteSettings?.timeZone ?? 'Asia/Krasnoyarsk'
      const confirmed = siteSettings?.custom?.timeZoneConfirmed === true
      if (!confirmed && detectedTimeZone) return detectedTimeZone
      return current
    })
    const [isDarkTheme, setIsDarkTheme] = useState(false)
    const [selectedPresetKey, setSelectedPresetKey] = useState(storedPresetKey)
    const [transferEnabled, setTransferEnabled] = useState(
      storedTransferSetting
    )
    const [createDemoRequest, setCreateDemoRequest] = useState(false)
    const [telegramCommunityUrl, setTelegramCommunityUrl] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [servicesLoaded, setServicesLoaded] = useState(
      Array.isArray(services)
    )
    const confirmRef = useRef(null)

    const step = STEPS[stepIndex]
    const selectedPreset = getOnboardingPreset(selectedPresetKey)
    const starterServices = getStarterServicesForPreset(selectedPresetKey)
    const hasExistingServices = Array.isArray(services) && services.length > 0
    const hasAnyEvent = Array.isArray(events) && events.length > 0
    const isLastStep = stepIndex === STEPS.length - 1
    const demoText =
      'Учебная заявка создается без даты мероприятия: это еще не подтвержденный заказ. Следующее действие будет поставлено на завтра в 12:00.'

    const errors = useMemo(
      () => ({
        firstName: !firstName.trim() ? 'Укажите имя' : null,
        secondName: !secondName.trim() ? 'Укажите фамилию' : null,
        town: !town.trim() ? 'Укажите город' : null,
        timeZone: !timeZone ? 'Укажите часовой пояс' : null,
        preset: !selectedPresetKey ? 'Выберите специализацию' : null,
      }),
      [firstName, secondName, town, timeZone, selectedPresetKey]
    )

    const isStepValid = useMemo(() => {
      if (step === 'profile') return !errors.firstName && !errors.secondName
      if (step === 'environment') return !errors.town && !errors.timeZone
      if (step === 'specialization') return !errors.preset
      return true
    }, [errors, step])

    useEffect(() => {
      setDeclineButtonShow(false)
      setCloseButtonShow(false)
      const storedTheme = localStorage.getItem('theme')
      const isDark = storedTheme === 'dark'
      setIsDarkTheme(isDark)
      document.body.classList.toggle('theme-dark', isDark)
    }, [setCloseButtonShow, setDeclineButtonShow])

    useEffect(() => {
      const meta = STEP_META[step]
      setTitle(`Первичная настройка: ${meta.title}`)
      setConfirmButtonName(isLastStep ? 'Завершить' : 'Далее')
      setDisableConfirm(isSaving || !isStepValid)
    }, [
      isLastStep,
      isSaving,
      isStepValid,
      setConfirmButtonName,
      setDisableConfirm,
      setTitle,
      step,
    ])

    useEffect(() => {
      if (servicesLoaded) return undefined
      let cancelled = false
      getData('/api/services').then((items) => {
        if (cancelled) return
        if (Array.isArray(items)) setServices(items)
        setServicesLoaded(true)
      })
      return () => {
        cancelled = true
      }
    }, [servicesLoaded, setServices])

    useEffect(() => {
      let cancelled = false
      getData('/api/site/community').then((data) => {
        if (cancelled) return
        setTelegramCommunityUrl(
          normalizeTelegramCommunityUrl(data?.telegramUrl)
        )
      })
      return () => {
        cancelled = true
      }
    }, [])

    const saveCustom = useCallback(
      async (customPatch) =>
        postData(
          '/api/site',
          {
            custom: mergeCustom(siteSettings, customPatch),
          },
          (data) => setSiteSettings(data),
          null,
          false,
          null
        ),
      [setSiteSettings, siteSettings]
    )

    const saveProfile = useCallback(async () => {
      if (!loggedUser?._id || !itemsFunc?.user?.set) return false
      const updatedUser = await itemsFunc.user.set({
        _id: loggedUser._id,
        firstName: firstName.trim(),
        secondName: secondName.trim(),
        thirdName: thirdName.trim(),
        phone: normalizePhoneValue(phone),
        whatsapp: normalizePhoneValue(whatsapp) || null,
        telegram: normalizeTelegramInput(telegram),
        images,
      })
      if (updatedUser?._id) setLoggedUser(updatedUser)
      return true
    }, [
      firstName,
      images,
      itemsFunc?.user,
      loggedUser?._id,
      phone,
      secondName,
      setLoggedUser,
      telegram,
      thirdName,
      whatsapp,
    ])

    const saveEnvironment = useCallback(async () => {
      const trimmedTown = town.trim()
      const nextTowns = normalizeTowns([
        ...(siteSettings?.towns ?? []),
        trimmedTown,
      ])

      await postData(
        '/api/site',
        {
          timeZone,
          defaultTown: trimmedTown,
          towns: nextTowns,
          custom: mergeCustom(siteSettings, { timeZoneConfirmed: true }),
        },
        (data) => setSiteSettings(data),
        null,
        false,
        null
      )
      fetch('/api/acquisition/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'onboarding_complete' }),
        keepalive: true,
      }).catch(() => null)
      reachGoalOnce('onboarding_complete')

      const themeValue = isDarkTheme ? 'dark' : 'light'
      localStorage.setItem('theme', themeValue)
      document.body.classList.toggle('theme-dark', isDarkTheme)
      return true
    }, [isDarkTheme, setSiteSettings, siteSettings, timeZone, town])

    const createStarterServices = useCallback(async () => {
      if (!itemsFunc?.service?.set) return
      if (Array.isArray(services) && services.length > 0) {
        snackbar.info(
          'Вижу, что у вас уже есть созданные услуги. Создание новых услуг из пресета может испортить структуру, поэтому лучше добавьте услуги вручную.'
        )
        await saveCustom({ [STARTER_SERVICES_MANUAL_KEY]: true })
        return
      }

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
      }
    }, [
      itemsFunc?.service,
      saveCustom,
      services,
      setServices,
      snackbar,
      starterServices,
    ])

    const saveSpecialization = useCallback(async () => {
      await saveCustom({ [ACTIVITY_PRESET_KEY]: selectedPresetKey })
      return true
    }, [saveCustom, selectedPresetKey])

    const saveTransferSetting = useCallback(async () => {
      await saveCustom({
        [SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY]: transferEnabled,
      })
      return true
    }, [saveCustom, transferEnabled])

    const createDemoEvent = useCallback(async () => {
      if (!createDemoRequest || hasAnyEvent || !itemsFunc?.event?.set) return

      const serviceIds = Array.isArray(services)
        ? services
            .slice(0, 2)
            .map((service) => service?._id)
            .filter(Boolean)
        : []
      const created = await itemsFunc.event.set(
        buildDemoEventPayload(selectedPresetKey, serviceIds),
        false,
        true
      )

      if (created?._id) {
        setEvents((prev) => {
          const existingIds = new Set((prev ?? []).map((item) => item?._id))
          if (existingIds.has(created._id)) return prev
          return [...(prev ?? []), created]
        })
        await saveCustom({ [DEMO_EVENT_CREATED_KEY]: true })
      }
    }, [
      createDemoRequest,
      hasAnyEvent,
      itemsFunc?.event,
      saveCustom,
      selectedPresetKey,
      services,
      setEvents,
    ])

    const completeWizard = useCallback(async () => {
      await createDemoEvent()
      if (!createDemoRequest) {
        await saveCustom({ [DEMO_EVENT_SKIPPED_KEY]: true })
      }
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
    }, [
      createDemoEvent,
      createDemoRequest,
      saveCustom,
      setSiteSettings,
      siteSettings?.custom,
    ])

    const saveCurrentStep = useCallback(async () => {
      if (!isStepValid) return false
      setIsSaving(true)
      try {
        if (step === 'profile') return await saveProfile()
        if (step === 'environment') return await saveEnvironment()
        if (step === 'specialization') return await saveSpecialization()
        if (step === 'transfer') return await saveTransferSetting()
        return true
      } catch (error) {
        console.error('First run wizard save error', error)
        snackbar.error('Не удалось сохранить шаг настройки')
        return false
      } finally {
        setIsSaving(false)
      }
    }, [
      isStepValid,
      saveEnvironment,
      saveProfile,
      saveSpecialization,
      saveTransferSetting,
      snackbar,
      step,
    ])

    const handleConfirm = useCallback(async () => {
      const saved = await saveCurrentStep()
      if (!saved) return
      if (isLastStep) {
        setIsSaving(true)
        try {
          await completeWizard()
          closeModal()
        } catch (error) {
          console.error('First run wizard complete error', error)
          snackbar.error('Не удалось завершить мастер настройки')
        } finally {
          setIsSaving(false)
        }
        return
      }
      setStepIndex((value) => Math.min(value + 1, STEPS.length - 1))
    }, [closeModal, completeWizard, isLastStep, saveCurrentStep, snackbar])

    useEffect(() => {
      confirmRef.current = handleConfirm
    }, [handleConfirm])

    useEffect(() => {
      setOnConfirmFunc(() => confirmRef.current?.())
    }, [setOnConfirmFunc])

    const goToPreviousStep = () =>
      setStepIndex((value) => Math.max(value - 1, 0))

    const renderProgress = () => (
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>
            Шаг {stepIndex + 1} из {STEPS.length}
          </span>
          {stepIndex > 0 && (
            <button
              type="button"
              className="cursor-pointer text-gray-600 underline-offset-2 hover:underline"
              onClick={goToPreviousStep}
              disabled={isSaving}
            >
              Назад
            </button>
          )}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {STEPS.map((item, index) => (
            <div
              key={item}
              className={cn(
                'h-1.5 rounded-full',
                index <= stepIndex ? 'bg-general' : 'bg-gray-200'
              )}
            />
          ))}
        </div>
        <Notice tone="neutral" className="rounded-md">
          {STEP_META[step].description}
        </Notice>
      </div>
    )

    const renderProfileStep = () => (
      <FormWrapper className="flex flex-col gap-3">
        <Notice tone="info" className="rounded-md">
          Заполните данные, по которым клиенты и документы будут узнавать вас.
          Фото можно добавить сейчас или позже в настройках профиля.
        </Notice>
        <InputImages
          label="Фото профиля"
          directory="users"
          images={images}
          onChange={setImages}
          maxImages={1}
          fullWidth
        />
        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
          <Input
            label="Имя"
            value={firstName}
            onChange={setFirstName}
            error={errors.firstName}
            required
            noMargin
          />
          <Input
            label="Фамилия"
            value={secondName}
            onChange={setSecondName}
            error={errors.secondName}
            required
            noMargin
          />
          <Input
            label="Отчество"
            value={thirdName}
            onChange={setThirdName}
            noMargin
          />
        </div>
        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
          <PhoneInput
            label="Телефон"
            value={phone}
            onChange={setPhone}
            noMargin
          />
          <PhoneInput
            label="Whatsapp"
            value={whatsapp}
            onChange={setWhatsapp}
            noMargin
          />
          <Input
            prefix="@"
            label="Telegram"
            value={telegram}
            onChange={(value) => setTelegram(normalizeTelegramInput(value))}
            noMargin
          />
        </div>
      </FormWrapper>
    )

    const renderEnvironmentStep = () => (
      <FormWrapper className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-md border px-3 py-3 text-left text-sm transition',
              !isDarkTheme
                ? 'border-general bg-general/10 text-gray-900'
                : 'border-gray-200 bg-white text-gray-700'
            )}
            onClick={() => {
              setIsDarkTheme(false)
              localStorage.setItem('theme', 'light')
              document.body.classList.remove('theme-dark')
            }}
          >
            <span className="block font-semibold">Светлая тема</span>
            <span className="mt-1 block text-xs text-gray-500">
              Спокойный режим для работы днем.
            </span>
          </button>
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-md border px-3 py-3 text-left text-sm transition',
              isDarkTheme
                ? 'border-general bg-general/10 text-gray-900'
                : 'border-gray-200 bg-white text-gray-700'
            )}
            onClick={() => {
              setIsDarkTheme(true)
              localStorage.setItem('theme', 'dark')
              document.body.classList.add('theme-dark')
            }}
          >
            <span className="block font-semibold">Темная тема</span>
            <span className="mt-1 block text-xs text-gray-500">
              Удобно вечером и на темных площадках.
            </span>
          </button>
        </div>
        <Input
          label="Основной город"
          value={town}
          onChange={setTown}
          error={errors.town}
          required
          fullWidth
          noMargin
        />
        <ComboBox
          label="Часовой пояс"
          items={timeZoneOptions}
          value={timeZone}
          onChange={setTimeZone}
          error={errors.timeZone}
          required
          fullWidth
          noMargin
        />
      </FormWrapper>
    )

    const renderSpecializationStep = () => (
      <FormWrapper className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
          {ONBOARDING_ACTIVITY_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.key}
              onClick={() => setSelectedPresetKey(preset.key)}
              className={cn(
                'cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition hover:border-general',
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
        <Notice tone="neutral" className="rounded-md">
          Группа - это полка, услуга - конкретное предложение. Если услуг мало,
          оставьте их без группы, а структуру усложните позже.
        </Notice>
        {hasExistingServices ? (
          <Notice tone="warning" className="rounded-md">
            Вижу, что у вас уже есть созданные услуги. Создание новых услуг из
            пресета может испортить структуру, поэтому лучше добавьте услуги
            вручную.
          </Notice>
        ) : (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <div className="mb-2 text-sm font-semibold text-gray-900">
              Стартовые услуги для пресета «{selectedPreset.shortTitle}»
            </div>
            <div className="flex flex-col gap-1.5">
              {starterServices.map((service) => (
                <div key={service.title} className="text-sm text-gray-600">
                  {service.title}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="action-icon-button action-icon-button--warning mt-3 inline-flex h-9 cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold"
              onClick={createStarterServices}
              disabled={isSaving || !servicesLoaded}
            >
              Создать услуги из пресета
            </button>
          </div>
        )}
      </FormWrapper>
    )

    const renderTransferStep = () => (
      <FormWrapper className="flex flex-col gap-3">
        <Notice tone="neutral" className="rounded-md">
          Если вы иногда отдаете заказ другому исполнителю, включите настройку.
          Тогда в редакторе заявки появятся поля «Передано коллеге» и выбор
          коллеги.
        </Notice>
        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-md border px-3 py-3 text-left text-sm transition',
              transferEnabled
                ? 'border-general bg-general/10 text-gray-900'
                : 'border-gray-200 bg-white text-gray-700'
            )}
            onClick={() => setTransferEnabled(true)}
          >
            <span className="block font-semibold">Да, бывает</span>
            <span className="mt-1 block text-xs text-gray-500">
              В карточке будут доступны передача и выбор коллеги.
            </span>
          </button>
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-md border px-3 py-3 text-left text-sm transition',
              !transferEnabled
                ? 'border-general bg-general/10 text-gray-900'
                : 'border-gray-200 bg-white text-gray-700'
            )}
            onClick={() => setTransferEnabled(false)}
          >
            <span className="block font-semibold">Нет, не передаю</span>
            <span className="mt-1 block text-xs text-gray-500">
              Поля передачи будут скрыты, чтобы не отвлекать.
            </span>
          </button>
        </div>
      </FormWrapper>
    )

    const renderStatusesStep = () => (
      <FormWrapper className="flex flex-col gap-3">
        <Notice tone="info" className="rounded-md font-semibold">
          Обычный путь: Заявка {'->'} Подтверждено {'->'} Закрыто. Если заказ
          сорвался, используйте Отменено.
        </Notice>
        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
          {getFirstRunStatusEducationItems().map((item) => (
            <div
              key={item.status}
              className="rounded-md border border-gray-200 bg-white px-3 py-2"
            >
              <div className="text-sm font-semibold text-gray-900">
                {item.title}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </FormWrapper>
    )

    const renderFinishStep = () => (
      <FormWrapper className="flex flex-col gap-3">
        <Notice
          tone="success"
          role="status"
          className="rounded-md py-3"
        >
          Спасибо за регистрацию. Основная настройка завершена. Подробнее со
          всеми возможностями можно познакомиться в блоке меню настроек.
        </Notice>
        {!hasAnyEvent && (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <IconCheckBox
              checked={createDemoRequest}
              onClick={() => setCreateDemoRequest((value) => !value)}
              label="Создать учебную заявку"
              noMargin
            />
            <div className="mt-2 text-sm text-gray-600">{demoText}</div>
          </div>
        )}
        {hasAnyEvent && (
          <Notice tone="neutral" className="rounded-md">
            У вас уже есть карточки, поэтому учебную заявку создавать не будем.
          </Notice>
        )}
        {telegramCommunityUrl ? (
          <Notice tone="info" className="rounded-md">
            <div className="font-semibold">Оставайтесь на связи</div>
            <div className="mt-1 text-sm">
              Вступайте в группу ArtistCRM в Telegram: там можно задать любой
              вопрос, получить помощь и предложить свою идею.
            </div>
            <a
              href={telegramCommunityUrl}
              target="_blank"
              rel="noreferrer"
              className="action-icon-button action-icon-button--warning mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold"
            >
              Вступить в группу Telegram
            </a>
          </Notice>
        ) : null}
      </FormWrapper>
    )

    const renderStep = () => {
      if (step === 'profile') return renderProfileStep()
      if (step === 'environment') return renderEnvironmentStep()
      if (step === 'specialization') return renderSpecializationStep()
      if (step === 'transfer') return renderTransferStep()
      if (step === 'statuses') return renderStatusesStep()
      return renderFinishStep()
    }

    return (
      <div className="flex w-full flex-col">
        {renderProgress()}
        {renderStep()}
      </div>
    )
  }

  return {
    title: 'Первичная настройка',
    showDecline: false,
    closeButtonShow: false,
    declineButtonShow: false,
    crossShow: false,
    Children: FirstRunWizardModal,
  }
}

export default userOnboardingFunc
