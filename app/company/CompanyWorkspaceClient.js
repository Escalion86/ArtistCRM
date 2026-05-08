'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiJson } from '@helpers/apiClient'

const EMPTY_LOCATION = {
  title: '',
  address: {
    town: '',
    street: '',
    house: '',
    room: '',
    comment: '',
  },
}

const EMPTY_STAFF = {
  firstName: '',
  secondName: '',
  phone: '',
  email: '',
  role: 'performer',
}

const getErrorMessage = (error) =>
  error?.message || 'Не удалось выполнить действие'

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}) => (
  <label className="grid gap-1 text-sm">
    <span className="font-medium text-black/65">{label}</span>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 px-3 bg-white border rounded-md outline-none border-black/15 focus:border-general"
    />
  </label>
)

const SelectField = ({ label, value, onChange, options }) => (
  <label className="grid gap-1 text-sm">
    <span className="font-medium text-black/65">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 px-3 bg-white border rounded-md outline-none cursor-pointer border-black/15 focus:border-general"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

export default function CompanyWorkspaceClient() {
  const [context, setContext] = useState(null)
  const [locations, setLocations] = useState([])
  const [staff, setStaff] = useState([])
  const [locationDraft, setLocationDraft] = useState(EMPTY_LOCATION)
  const [staffDraft, setStaffDraft] = useState(EMPTY_STAFF)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasAccess = Boolean(context?.tenantId && context?.staff)
  const canManage = ['owner', 'admin'].includes(context?.role)

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const me = await apiJson('/api/party/me', { cache: 'no-store' })
      setContext(me.data)

      const [locationsResponse, staffResponse] = await Promise.all([
        apiJson('/api/party/locations', { cache: 'no-store' }),
        apiJson('/api/party/staff', { cache: 'no-store' }),
      ])
      setLocations(locationsResponse.data ?? [])
      setStaff(staffResponse.data ?? [])
    } catch (loadError) {
      if (loadError.status === 403) {
        setContext(null)
      } else {
        setError(getErrorMessage(loadError))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const companyTitle = useMemo(
    () => context?.company?.title || 'PartyCRM',
    [context]
  )

  const bootstrapCompany = async () => {
    setSaving(true)
    setError('')
    try {
      await apiJson('/api/party/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ title: 'Моя компания' }),
      })
      await loadWorkspace()
    } catch (bootstrapError) {
      setError(getErrorMessage(bootstrapError))
    } finally {
      setSaving(false)
    }
  }

  const addLocation = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await apiJson('/api/party/locations', {
        method: 'POST',
        body: JSON.stringify(locationDraft),
      })
      setLocations((items) => [...items, response.data])
      setLocationDraft(EMPTY_LOCATION)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const addStaff = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await apiJson('/api/party/staff', {
        method: 'POST',
        body: JSON.stringify(staffDraft),
      })
      setStaff((items) => [...items, response.data])
      setStaffDraft(EMPTY_STAFF)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const archiveLocation = async (id) => {
    setSaving(true)
    setError('')
    try {
      await apiJson(`/api/party/locations/${id}`, { method: 'DELETE' })
      setLocations((items) => items.filter((item) => item._id !== id))
    } catch (archiveError) {
      setError(getErrorMessage(archiveError))
    } finally {
      setSaving(false)
    }
  }

  const archiveStaff = async (id) => {
    setSaving(true)
    setError('')
    try {
      await apiJson(`/api/party/staff/${id}`, { method: 'DELETE' })
      setStaff((items) => items.filter((item) => item._id !== id))
    } catch (archiveError) {
      setError(getErrorMessage(archiveError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="max-w-6xl px-5 py-10 mx-auto">
        <p className="text-sm text-black/60">Загружаем PartyCRM workspace...</p>
      </section>
    )
  }

  if (!hasAccess) {
    return (
      <section className="max-w-6xl px-5 py-10 mx-auto">
        <p className="text-sm font-semibold uppercase text-general">
          Company workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
          Подключение PartyCRM
        </h1>
        <p className="max-w-2xl mt-4 leading-7 text-black/70">
          Для текущего аккаунта еще не создана компания PartyCRM. В technical
          preview можно создать первый tenant и owner-запись для текущей сессии.
        </p>
        {error && (
          <div className="max-w-2xl p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
            {error}
          </div>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={bootstrapCompany}
          className="mt-6 cursor-pointer ui-btn ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Создаем...' : 'Создать компанию PartyCRM'}
        </button>
      </section>
    )
  }

  return (
    <section className="max-w-6xl px-5 py-8 mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-general">
            Company workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold font-futuraPT sm:text-4xl">
            {companyTitle}
          </h1>
          <p className="mt-2 text-sm text-black/60">
            Роль: {context.role}. Tenant: {context.tenantId}
          </p>
        </div>
        <button
          type="button"
          onClick={loadWorkspace}
          className="cursor-pointer ui-btn ui-btn-secondary"
        >
          Обновить
        </button>
      </div>

      {error && (
        <div className="p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-5 mt-8 lg:grid-cols-2">
        <div className="p-5 bg-white border rounded-lg border-black/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Точки</h2>
            <span className="text-sm text-black/55">{locations.length}</span>
          </div>

          {canManage && (
            <form onSubmit={addLocation} className="grid gap-3 mt-5">
              <Field
                label="Название"
                value={locationDraft.title}
                placeholder="Зал на Мира"
                onChange={(value) =>
                  setLocationDraft((draft) => ({ ...draft, title: value }))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Город"
                  value={locationDraft.address.town}
                  onChange={(value) =>
                    setLocationDraft((draft) => ({
                      ...draft,
                      address: { ...draft.address, town: value },
                    }))
                  }
                />
                <Field
                  label="Улица"
                  value={locationDraft.address.street}
                  onChange={(value) =>
                    setLocationDraft((draft) => ({
                      ...draft,
                      address: { ...draft.address, street: value },
                    }))
                  }
                />
                <Field
                  label="Дом"
                  value={locationDraft.address.house}
                  onChange={(value) =>
                    setLocationDraft((draft) => ({
                      ...draft,
                      address: { ...draft.address, house: value },
                    }))
                  }
                />
                <Field
                  label="Зал/комната"
                  value={locationDraft.address.room}
                  onChange={(value) =>
                    setLocationDraft((draft) => ({
                      ...draft,
                      address: { ...draft.address, room: value },
                    }))
                  }
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer ui-btn ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Добавить точку
              </button>
            </form>
          )}

          <div className="grid gap-3 mt-5">
            {locations.length === 0 && (
              <p className="text-sm text-black/55">Точки еще не добавлены.</p>
            )}
            {locations.map((location) => (
              <div
                key={location._id}
                className="p-4 border rounded-md border-black/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{location.title}</p>
                    <p className="mt-1 text-sm text-black/60">
                      {[
                        location.address?.town,
                        location.address?.street,
                        location.address?.house,
                        location.address?.room,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Адрес не указан'}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => archiveLocation(location._id)}
                      className="text-sm cursor-pointer text-danger"
                    >
                      Архив
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-white border rounded-lg border-black/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Сотрудники</h2>
            <span className="text-sm text-black/55">{staff.length}</span>
          </div>

          {canManage && (
            <form onSubmit={addStaff} className="grid gap-3 mt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Имя"
                  value={staffDraft.firstName}
                  onChange={(value) =>
                    setStaffDraft((draft) => ({ ...draft, firstName: value }))
                  }
                />
                <Field
                  label="Фамилия"
                  value={staffDraft.secondName}
                  onChange={(value) =>
                    setStaffDraft((draft) => ({ ...draft, secondName: value }))
                  }
                />
                <Field
                  label="Телефон"
                  value={staffDraft.phone}
                  onChange={(value) =>
                    setStaffDraft((draft) => ({ ...draft, phone: value }))
                  }
                />
                <Field
                  label="Email"
                  type="email"
                  value={staffDraft.email}
                  onChange={(value) =>
                    setStaffDraft((draft) => ({ ...draft, email: value }))
                  }
                />
              </div>
              <SelectField
                label="Роль"
                value={staffDraft.role}
                onChange={(value) =>
                  setStaffDraft((draft) => ({ ...draft, role: value }))
                }
                options={[
                  { value: 'performer', label: 'Исполнитель' },
                  { value: 'admin', label: 'Администратор' },
                  { value: 'owner', label: 'Владелец' },
                ]}
              />
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer ui-btn ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Добавить сотрудника
              </button>
            </form>
          )}

          <div className="grid gap-3 mt-5">
            {staff.length === 0 && (
              <p className="text-sm text-black/55">
                Сотрудники еще не добавлены.
              </p>
            )}
            {staff.map((person) => (
              <div key={person._id} className="p-4 border rounded-md border-black/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {[person.secondName, person.firstName].filter(Boolean).join(' ') ||
                        person.phone ||
                        person.email ||
                        'Без имени'}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {person.role} · {[person.phone, person.email].filter(Boolean).join(' · ') ||
                        'контакты не указаны'}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => archiveStaff(person._id)}
                      className="text-sm cursor-pointer text-danger"
                    >
                      Архив
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
