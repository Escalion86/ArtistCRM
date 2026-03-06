'use client'

import { useEffect, useState } from 'react'
import IconCheckBox from '@components/IconCheckBox'
import AddIconButton from '@components/AddIconButton'
import IconActionButton from '@components/IconActionButton'
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'

const DEFAULT_CALENDAR_REMINDERS = Object.freeze({
  useDefault: false,
  overrides: [
    { method: 'popup', minutes: 60 },
    { method: 'popup', minutes: 24 * 60 },
  ],
})

const DEFAULT_STATUS_COLORS = Object.freeze({
  draft: '8',
  active: '9',
  canceled: '11',
  closed: '10',
})

const STATUS_COLOR_OPTIONS = Object.freeze([
  { value: '1', name: '1 — Lavendar' },
  { value: '2', name: '2 — Sage' },
  { value: '3', name: '3 — Grape' },
  { value: '4', name: '4 — Flamingo' },
  { value: '5', name: '5 — Banana' },
  { value: '6', name: '6 — Tangerine' },
  { value: '7', name: '7 — Peacock' },
  { value: '8', name: '8 — Graphite' },
  { value: '9', name: '9 — Blueberry' },
  { value: '10', name: '10 — Basil' },
  { value: '11', name: '11 — Tomato' },
])

const STATUS_COLOR_FIELDS = Object.freeze([
  { key: 'draft', label: 'Заявка' },
  { key: 'active', label: 'Мероприятие' },
  { key: 'canceled', label: 'Отменено' },
  { key: 'closed', label: 'Закрыто' },
])

const normalizeReminders = (value) => {
  if (!value || typeof value !== 'object') return DEFAULT_CALENDAR_REMINDERS
  const useDefault = Boolean(value.useDefault)
  const overrides = Array.isArray(value.overrides)
    ? value.overrides
        .filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            (item.method === 'email' || item.method === 'popup') &&
            Number.isFinite(Number(item.minutes)) &&
            Number(item.minutes) > 0
        )
        .map((item) => ({
          method: item.method,
          minutes: Number(item.minutes),
        }))
    : []
  return {
    useDefault,
    overrides:
      overrides.length > 0 ? overrides : DEFAULT_CALENDAR_REMINDERS.overrides,
  }
}

const normalizeStatusColors = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  const normalizeColor = (color, fallback) => {
    const prepared = String(color ?? '').trim()
    return /^(?:[1-9]|1[0-1])$/.test(prepared) ? prepared : fallback
  }
  return {
    draft: normalizeColor(source.draft, DEFAULT_STATUS_COLORS.draft),
    active: normalizeColor(source.active, DEFAULT_STATUS_COLORS.active),
    canceled: normalizeColor(source.canceled, DEFAULT_STATUS_COLORS.canceled),
    closed: normalizeColor(source.closed, DEFAULT_STATUS_COLORS.closed),
  }
}

const GoogleCalendarSettings = ({ redirectPath = '/cabinet/integrations' }) => {
  const [calendarStatus, setCalendarStatus] = useState({
    loading: true,
    allowCalendarSync: false,
    connected: false,
    enabled: false,
    calendarId: '',
    calendarName: '',
  })
  const [calendarItems, setCalendarItems] = useState([])
  const [selectedCalendarId, setSelectedCalendarId] = useState('')
  const [calendarError, setCalendarError] = useState('')
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarReminders, setCalendarReminders] = useState(
    DEFAULT_CALENDAR_REMINDERS
  )
  const [statusColors, setStatusColors] = useState(DEFAULT_STATUS_COLORS)
  const [checkedSyncSummary, setCheckedSyncSummary] = useState('')

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
      setCalendarReminders(normalizeReminders(result?.data?.reminders))
      setStatusColors(normalizeStatusColors(result?.data?.statusColors))
    } catch (error) {
      setCalendarError('Не удалось загрузить статус')
      setCalendarStatus((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCalendarStatus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const handleConnectCalendar = async () => {
    if (calendarLoading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch(
        `/api/google-calendar/auth-url?redirect=${encodeURIComponent(redirectPath)}`
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
      setCalendarReminders(DEFAULT_CALENDAR_REMINDERS)
      setStatusColors(DEFAULT_STATUS_COLORS)
      await loadCalendarStatus()
    } catch (error) {
      setCalendarError('Не удалось отключить календарь')
    }
    setCalendarLoading(false)
  }

  const handleSaveReminders = async () => {
    if (calendarLoading || calendarStatus.loading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch('/api/google-calendar/reminders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reminders: calendarReminders }),
      })
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(result?.error || 'Не удалось сохранить уведомления')
        setCalendarLoading(false)
        return
      }
      await loadCalendarStatus()
    } catch (error) {
      setCalendarError('Не удалось сохранить уведомления')
    }
    setCalendarLoading(false)
  }

  const handleSaveStatusColors = async () => {
    if (calendarLoading || calendarStatus.loading) return
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const response = await fetch('/api/google-calendar/reminders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ statusColors, reminders: calendarReminders }),
      })
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(result?.error || 'Не удалось сохранить цвета')
        setCalendarLoading(false)
        return
      }
      await loadCalendarStatus()
    } catch (error) {
      setCalendarError('Не удалось сохранить цвета')
    }
    setCalendarLoading(false)
  }

  const handleSyncCheckedEvents = async () => {
    if (calendarLoading || calendarStatus.loading) return
    setCalendarLoading(true)
    setCalendarError('')
    setCheckedSyncSummary('')
    try {
      const response = await fetch('/api/events/google-sync-checked', {
        method: 'POST',
      })
      const result = await response.json()
      if (!result?.success) {
        setCalendarError(
          result?.error || 'Не удалось синхронизировать проверенные мероприятия'
        )
        setCalendarLoading(false)
        return
      }
      const { total = 0, synced = 0, failed = 0 } = result?.data ?? {}
      setCheckedSyncSummary(
        `Синхронизировано: ${synced} из ${total}. Ошибок: ${failed}.`
      )
    } catch (error) {
      setCalendarError('Не удалось синхронизировать проверенные мероприятия')
    }
    setCalendarLoading(false)
  }

  if (!calendarStatus.allowCalendarSync) return null

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-800">Google Calendar</div>
      <div className="mt-2 text-sm text-gray-600">
        {calendarStatus.connected ? 'Подключен' : 'Не подключен'}
      </div>
      {calendarStatus.connected && calendarStatus.calendarId ? (
        <div className="mt-1 text-xs text-gray-500">
          Календарь:{' '}
          {calendarStatus.calendarName ||
            calendarItems.find((item) => item.id === calendarStatus.calendarId)
              ?.summary ||
            calendarStatus.calendarId}
        </div>
      ) : null}
      {calendarError ? (
        <div className="mt-2 text-xs text-red-600">{calendarError}</div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!calendarStatus.connected ? (
          <button
            type="button"
            className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={handleConnectCalendar}
            disabled={calendarLoading || calendarStatus.loading}
          >
            {calendarLoading ? 'Подключение...' : 'Подключить Google Calendar'}
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
      {calendarStatus.connected ? (
        <div className="mt-3 rounded border border-gray-200 bg-white p-3">
          <div className="text-sm font-semibold text-gray-800">
            Массовая синхронизация
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Отправляет в Google Calendar все мероприятия, у которых включена
            метка «Импорт из календаря проверен».
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              onClick={handleSyncCheckedEvents}
              disabled={calendarLoading || calendarStatus.loading}
            >
              Синхронизировать Google Calendar
            </button>
          </div>
          {checkedSyncSummary ? (
            <div className="mt-2 text-xs text-emerald-700">
              {checkedSyncSummary}
            </div>
          ) : null}
        </div>
      ) : null}
      {calendarItems.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded border border-gray-300 px-2 text-sm"
            value={selectedCalendarId}
            onChange={(event) => setSelectedCalendarId(event.target.value)}
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
      <div className="mt-4 rounded border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold text-gray-800">
          Уведомления Google Calendar
        </div>
        <div className="mt-2">
          <IconCheckBox
            checked={calendarReminders.useDefault}
            onClick={() =>
              setCalendarReminders((prev) => ({
                ...prev,
                useDefault: !prev.useDefault,
              }))
            }
            label="Использовать стандартные уведомления Google"
            small
            noMargin
            disabled={!calendarStatus.connected}
          />
        </div>
        {!calendarReminders.useDefault && (
          <div className="mt-2 flex flex-col gap-2">
            {calendarReminders.overrides.map((item, index) => (
              <div
                key={`calendar-reminder-${index}`}
                className="flex flex-wrap items-center gap-2"
              >
                <select
                  className="h-9 rounded border border-gray-300 px-2 text-sm"
                  value={item.method}
                  onChange={(event) => {
                    const method = event.target.value
                    setCalendarReminders((prev) => ({
                      ...prev,
                      overrides: prev.overrides.map((row, idx) =>
                        idx === index ? { ...row, method } : row
                      ),
                    }))
                  }}
                  disabled={!calendarStatus.connected}
                >
                  <option value="popup">Уведомление</option>
                  <option value="email">Email</option>
                </select>
                <input
                  type="number"
                  min={1}
                  className="h-9 w-24 rounded border border-gray-300 px-2 text-sm"
                  value={item.minutes}
                  onChange={(event) => {
                    const minutes = Number(event.target.value)
                    setCalendarReminders((prev) => ({
                      ...prev,
                      overrides: prev.overrides.map((row, idx) =>
                        idx === index
                          ? { ...row, minutes: Number.isNaN(minutes) ? 0 : minutes }
                          : row
                      ),
                    }))
                  }}
                  disabled={!calendarStatus.connected}
                />
                <span className="text-xs text-gray-500">минут до</span>
                <IconActionButton
                  icon={faTrashAlt}
                  onClick={() =>
                    setCalendarReminders((prev) => ({
                      ...prev,
                      overrides: prev.overrides.filter((_, idx) => idx !== index),
                    }))
                  }
                  disabled={!calendarStatus.connected}
                  title="Удалить уведомление"
                  variant="danger"
                  size="xs"
                />
              </div>
            ))}
            <AddIconButton
              onClick={() =>
                setCalendarReminders((prev) => ({
                  ...prev,
                  overrides: [
                    ...prev.overrides,
                    { method: 'popup', minutes: 60 },
                  ],
                }))
              }
              disabled={!calendarStatus.connected}
              title="Добавить уведомление"
              size="xs"
            />
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={handleSaveReminders}
            disabled={
              calendarLoading ||
              calendarStatus.loading ||
              !calendarStatus.connected ||
              (!calendarReminders.useDefault &&
                calendarReminders.overrides.length === 0)
            }
          >
            Сохранить уведомления
          </button>
        </div>
      </div>
      <div className="mt-4 rounded border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold text-gray-800">
          Цвета мероприятий по статусам
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Цвет применяется к событию в Google Calendar при синхронизации.
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {STATUS_COLOR_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-sm text-gray-700">{field.label}</span>
              <select
                className="h-9 min-w-[180px] rounded border border-gray-300 px-2 text-sm"
                value={statusColors[field.key]}
                onChange={(event) =>
                  setStatusColors((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
                disabled={!calendarStatus.connected}
              >
                {STATUS_COLOR_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="modal-action-button bg-general px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={handleSaveStatusColors}
            disabled={
              calendarLoading || calendarStatus.loading || !calendarStatus.connected
            }
          >
            Сохранить цвета
          </button>
        </div>
      </div>
    </div>
  )
}

export default GoogleCalendarSettings
