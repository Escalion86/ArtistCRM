import ComboBox from '@components/ComboBox'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import { postData } from '@helpers/CRUD'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAtom, useAtomValue } from 'jotai'

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

const normalizeTowns = (towns = []) =>
  Array.from(
    new Set(
      towns
        .map((town) => (typeof town === 'string' ? town.trim() : ''))
        .filter(Boolean)
    )
  )

const userOnboardingFunc = () => {
  const UserOnboardingModal = ({
    closeModal,
    setOnConfirmFunc,
    setDisableConfirm,
    setConfirmButtonName,
  }) => {
    const [loggedUser, setLoggedUser] = useAtom(loggedUserAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    const itemsFunc = useAtomValue(itemsFuncAtom)

    const [firstName, setFirstName] = useState(loggedUser?.firstName ?? '')
    const [secondName, setSecondName] = useState(
      loggedUser?.secondName ?? ''
    )
    const [town, setTown] = useState(
      loggedUser?.town ?? siteSettings?.defaultTown ?? ''
    )
    const [timeZone, setTimeZone] = useState(
      siteSettings?.timeZone ?? 'Asia/Krasnoyarsk'
    )
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
      setConfirmButtonName('Сохранить')
    }, [setConfirmButtonName])

    const errors = useMemo(() => {
      return {
        firstName: !firstName.trim() ? 'Укажите имя' : null,
        secondName: !secondName.trim() ? 'Укажите фамилию' : null,
        town: !town.trim() ? 'Укажите город' : null,
        timeZone: !timeZone ? 'Укажите часовой пояс' : null,
      }
    }, [firstName, secondName, town, timeZone])

    const isValid = useMemo(
      () =>
        !errors.firstName &&
        !errors.secondName &&
        !errors.town &&
        !errors.timeZone,
      [errors]
    )

    useEffect(() => {
      setDisableConfirm(!isValid || isSaving)
    }, [isSaving, isValid, setDisableConfirm])

    const handleSave = useCallback(async () => {
      if (!isValid || !loggedUser?._id) return
      setIsSaving(true)

      const trimmedFirstName = firstName.trim()
      const trimmedSecondName = secondName.trim()
      const trimmedTown = town.trim()

      const updatedUser = await itemsFunc?.user?.set({
        _id: loggedUser._id,
        firstName: trimmedFirstName,
        secondName: trimmedSecondName,
        town: trimmedTown,
      })

      if (updatedUser?._id) {
        setLoggedUser(updatedUser)
      }

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
        },
        (data) => setSiteSettings(data),
        null,
        false,
        null
      )

      setIsSaving(false)
      closeModal()
    }, [
      closeModal,
      firstName,
      secondName,
      town,
      timeZone,
      isValid,
      loggedUser?._id,
      itemsFunc?.user,
      setLoggedUser,
      setSiteSettings,
      siteSettings?.towns,
    ])

    const onConfirmRef = useRef(handleSave)

    useEffect(() => {
      onConfirmRef.current = handleSave
    }, [handleSave])

    useEffect(() => {
      setOnConfirmFunc(() => onConfirmRef.current?.())
    }, [setOnConfirmFunc])

    return (
      <FormWrapper flex className="flex-col gap-3">
        <div className="text-sm text-gray-600">
          Заполните обязательные данные для корректной работы системы.
        </div>
        <Input
          label="Имя"
          value={firstName}
          onChange={setFirstName}
          error={errors.firstName}
          required
        />
        <Input
          label="Фамилия"
          value={secondName}
          onChange={setSecondName}
          error={errors.secondName}
          required
        />
        <Input
          label="Город"
          value={town}
          onChange={setTown}
          error={errors.town}
          required
        />
        <ComboBox
          label="Часовой пояс"
          items={TIME_ZONE_OPTIONS}
          value={timeZone}
          onChange={setTimeZone}
          error={errors.timeZone}
          required
          fullWidth
        />
      </FormWrapper>
    )
  }

  return {
    title: 'Заполните профиль',
    showDecline: false,
    closeButtonShow: false,
    crossShow: false,
    Children: UserOnboardingModal,
  }
}

export default userOnboardingFunc
