import ErrorsList from '@components/ErrorsList'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import InputImages from '@components/InputImages'
import PhoneInput from '@components/PhoneInput'
import compareArrays from '@helpers/compareArrays'
import { DEFAULT_USER } from '@helpers/constants'
import useErrors from '@helpers/useErrors'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import usersAtom from '@state/atoms/usersAtom'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import { modalsFuncAtom } from '@state/atoms'

const normalizePhone = (value) =>
  value ? String(value).replace(/[^\d]/g, '') : ''

const ProfileContent = () => {
  const [loggedUser, setLoggedUser] = useAtom(loggedUserAtom)
  const users = useAtomValue(usersAtom)
  const setUser = useAtomValue(itemsFuncAtom).user.set
  const modalsFunc = useAtomValue(modalsFuncAtom)

  const [firstName, setFirstName] = useState(DEFAULT_USER.firstName)
  const [secondName, setSecondName] = useState(DEFAULT_USER.secondName)
  const [thirdName, setThirdName] = useState(DEFAULT_USER.thirdName)

  const [email, setEmail] = useState(DEFAULT_USER.email)
  const [phone, setPhone] = useState(DEFAULT_USER.phone)
  const [whatsapp, setWhatsapp] = useState(DEFAULT_USER.whatsapp)
  const [viber, setViber] = useState(DEFAULT_USER.viber)
  const [telegram, setTelegram] = useState(DEFAULT_USER.telegram)
  const [instagram, setInstagram] = useState(DEFAULT_USER.instagram)
  const [vk, setVk] = useState(DEFAULT_USER.vk)
  const [images, setImages] = useState(DEFAULT_USER.images)
  const [isSaving, setIsSaving] = useState(false)
  const [calendarStatus, setCalendarStatus] = useState({
    loading: true,
    allowCalendarSync: false,
    connected: false,
    enabled: false,
    calendarId: '',
  })
  const [calendarItems, setCalendarItems] = useState([])
  const [selectedCalendarId, setSelectedCalendarId] = useState('')
  const [calendarError, setCalendarError] = useState('')
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [errors, checkErrors, addError, removeError, clearErrors] = useErrors()

  useEffect(() => {
    if (!loggedUser) return
    setFirstName(loggedUser.firstName ?? DEFAULT_USER.firstName)
    setSecondName(loggedUser.secondName ?? DEFAULT_USER.secondName)
    setThirdName(loggedUser.thirdName ?? DEFAULT_USER.thirdName)
    setEmail(loggedUser.email ?? DEFAULT_USER.email)
    setPhone(loggedUser.phone ?? DEFAULT_USER.phone)
    setWhatsapp(loggedUser.whatsapp ?? DEFAULT_USER.whatsapp)
    setViber(loggedUser.viber ?? DEFAULT_USER.viber)
    setTelegram(loggedUser.telegram ?? DEFAULT_USER.telegram)
    setInstagram(loggedUser.instagram ?? DEFAULT_USER.instagram)
    setVk(loggedUser.vk ?? DEFAULT_USER.vk)
    setImages(loggedUser.images ?? DEFAULT_USER.images)
    clearErrors()
  }, [loggedUser])

  const loadCalendarStatus = async () => {
    setCalendarError('')
    setCalendarStatus((prev) => ({ ...prev, loading: true }))
    try {
      const response = await fetch('/api/google-calendar/status')
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(result?.error || 'Не удалось загрузить статус')
        setCalendarStatus((prev) => ({ ...prev, loading: false }))
        return
      }
      setCalendarStatus({ loading: false, ...result.data })
    } catch (error) {
      setCalendarError('Не удалось загрузить статус')
      setCalendarStatus((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    loadCalendarStatus()
  }, [])

  const handleConnectCalendar = async () => {
    if (calendarLoading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch(
        '/api/google-calendar/auth-url?redirect=/cabinet/profile'
      )
      const result = await response.json()
      if (!result?.success || !result?.data?.url) {
        setCalendarError(result?.error || 'Не удалось получить ссылку')
        setCalendarLoading(false)
        return
      }
      window.location.href = result.data.url
    } catch (error) {
      setCalendarError('Не удалось подключить календарь')
      setCalendarLoading(false)
    }
  }

  const handleLoadCalendars = async () => {
    if (calendarLoading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch('/api/google-calendar/calendars')
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(result?.error || 'Не удалось загрузить календари')
        setCalendarLoading(false)
        return
      }
      const calendars = Array.isArray(result?.data?.calendars)
        ? result.data.calendars
        : []
      const selectedId = result?.data?.selectedId || ''
      setCalendarItems(calendars)
      setSelectedCalendarId(selectedId)
    } catch (error) {
      setCalendarError('Не удалось загрузить календари')
    }
    setCalendarLoading(false)
  }

  const handleSelectCalendar = async () => {
    if (!selectedCalendarId || calendarLoading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch('/api/google-calendar/select', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ calendarId: selectedCalendarId }),
      })
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(result?.error || 'Не удалось сохранить календарь')
        setCalendarLoading(false)
        return
      }
      await loadCalendarStatus()
    } catch (error) {
      setCalendarError('Не удалось сохранить календарь')
    }
    setCalendarLoading(false)
  }

  const handleDisconnectCalendar = async () => {
    if (calendarLoading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      })
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(result?.error || 'Не удалось отключить календарь')
        setCalendarLoading(false)
        return
      }
      setCalendarItems([])
      setSelectedCalendarId('')
      await loadCalendarStatus()
    } catch (error) {
      setCalendarError('Не удалось отключить календарь')
    }
    setCalendarLoading(false)
  }

  const isFormChanged = useMemo(() => {
    if (!loggedUser) return false
    return (
      loggedUser.firstName !== firstName ||
      loggedUser.secondName !== secondName ||
      loggedUser.thirdName !== thirdName ||
      loggedUser.email !== email ||
      loggedUser.phone !== phone ||
      loggedUser.whatsapp !== whatsapp ||
      loggedUser.viber !== viber ||
      loggedUser.telegram !== telegram ||
      loggedUser.instagram !== instagram ||
      loggedUser.vk !== vk ||
      !compareArrays(loggedUser.images, images)
    )
  }, [
    loggedUser,
    firstName,
    secondName,
    thirdName,
    email,
    phone,
    whatsapp,
    viber,
    telegram,
    instagram,
    vk,
    images,
  ])

  const handleSave = async () => {
    if (!loggedUser || isSaving) return
    const normalizedPhone = normalizePhone(phone)
    if (normalizedPhone) {
      const existedUser = users.find(
        (user) =>
          user._id !== loggedUser._id &&
          normalizePhone(user.phone) === normalizedPhone
      )
      if (existedUser) {
        addError({
          phone: 'Пользователь с таким номером телефона уже существует',
        })
        return
      }
    }

    if (
      checkErrors({
        phone,
        viber,
        whatsapp,
        email,
      })
    )
      return

    setIsSaving(true)
    const result = await setUser({
      _id: loggedUser._id,
      firstName,
      secondName,
      thirdName,
      email,
      phone,
      whatsapp,
      viber,
      telegram,
      instagram,
      vk,
      images,
    })
    if (result?._id) setLoggedUser(result)
    setIsSaving(false)
  }

  if (!loggedUser) {
    return (
      <div className="px-2 text-sm text-gray-600">
        Данные пользователя не найдены.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-2 pb-6">
      <div className="sticky top-0 z-10 -mx-2 border-b border-gray-200 bg-white/95 px-2 py-2 backdrop-blur">
        <div className="flex justify-end">
          <button
            type="button"
            className="modal-action-button bg-general px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={!isFormChanged || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
      <FormWrapper className="w-full">
        <InputImages
          label="Фотографии"
          directory="users"
          images={images}
          onChange={(nextImages) => {
            removeError('images')
            setImages(nextImages)
          }}
          error={errors.images}
        />
        <Input
          label="Имя"
          type="text"
          value={firstName}
          onChange={(value) => {
            removeError('firstName')
            setFirstName(value)
          }}
          error={errors.firstName}
          autoComplete="one-time-code"
        />
        <Input
          label="Фамилия"
          type="text"
          value={secondName}
          onChange={(value) => {
            removeError('secondName')
            setSecondName(value)
          }}
          error={errors.secondName}
          autoComplete="one-time-code"
        />
        <Input
          label="Отчество"
          type="text"
          value={thirdName}
          onChange={(value) => {
            removeError('thirdName')
            setThirdName(value)
          }}
          error={errors.thirdName}
          autoComplete="one-time-code"
        />
        <FormWrapper grid>
          <PhoneInput
            label="Телефон"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            copyPasteButtons
          />
          <PhoneInput
            label="Whatsapp"
            value={whatsapp}
            onChange={setWhatsapp}
            error={errors.whatsapp}
            copyPasteButtons
          />
          <PhoneInput
            label="Viber"
            value={viber}
            onChange={setViber}
            error={errors.viber}
            copyPasteButtons
          />
          <Input
            prefix="t.me/"
            label="Telegram (никнейм)"
            value={telegram}
            onChange={setTelegram}
          />
          <Input
            prefix="instagram.com/"
            label="Instagram"
            value={instagram}
            onChange={setInstagram}
          />
          <Input prefix="vk.com/" label="Vk" value={vk} onChange={setVk} />
          <Input
            label="Email"
            value={email}
            onChange={setEmail}
            error={errors.email}
          />
        </FormWrapper>
        <ErrorsList errors={errors} />
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-800">
            Google Calendar
          </div>
          {!calendarStatus.allowCalendarSync ? (
            <div className="mt-2 text-sm text-gray-600">
              Синхронизация доступна только на тарифах с поддержкой календаря.
            </div>
          ) : (
            <>
              <div className="mt-2 text-sm text-gray-600">
                {calendarStatus.connected ? 'Подключен' : 'Не подключен'}
              </div>
              {calendarStatus.connected && calendarStatus.calendarId ? (
                <div className="mt-1 text-xs text-gray-500">
                  Календарь: {calendarStatus.calendarId}
                </div>
              ) : null}
              {calendarError ? (
                <div className="mt-2 text-xs text-red-600">
                  {calendarError}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {!calendarStatus.connected ? (
                  <button
                    type="button"
                    className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    onClick={handleConnectCalendar}
                    disabled={calendarLoading || calendarStatus.loading}
                  >
                    {calendarLoading
                      ? 'Подключение...'
                      : 'Подключить Google Calendar'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      onClick={handleLoadCalendars}
                      disabled={calendarLoading}
                    >
                      Выбрать календарь
                    </button>
                    <button
                      type="button"
                      className="modal-action-button bg-danger px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      onClick={handleDisconnectCalendar}
                      disabled={calendarLoading}
                    >
                      Отключить
                    </button>
                  </>
                )}
              </div>
              {calendarItems.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded border border-gray-300 px-2 text-sm"
                    value={selectedCalendarId}
                    onChange={(event) =>
                      setSelectedCalendarId(event.target.value)
                    }
                  >
                    {calendarItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.primary ? 'Основной' : item.summary || item.id}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    onClick={handleSelectCalendar}
                    disabled={!selectedCalendarId || calendarLoading}
                  >
                    Сохранить
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="h-9 cursor-pointer rounded border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            onClick={() => modalsFunc.user?.changePassword?.()}
          >
            Сменить пароль
          </button>
        </div>
      </FormWrapper>
    </div>
  )
}

export default ProfileContent
