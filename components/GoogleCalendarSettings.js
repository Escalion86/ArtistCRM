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
    </div>
  )
}

export default GoogleCalendarSettings
