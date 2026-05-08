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

const EMPTY_ORDER = {
  title: '',
  client: {
    name: '',
    phone: '',
  },
  eventDate: '',
  placeType: 'company_location',
  locationId: '',
  customAddress: '',
  serviceTitle: '',
  clientPayment: {
    totalAmount: '',
    prepaidAmount: '',
    status: 'none',
  },
  assignedStaff: [],
}

const getErrorMessage = (error) =>
  error?.message || 'Не удалось выполнить действие'

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString('ru-RU')} ₽`

const formatDateTime = (value) => {
  if (!value) return 'Дата не указана'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата не указана'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
  const [orders, setOrders] = useState([])
  const [locationDraft, setLocationDraft] = useState(EMPTY_LOCATION)
  const [staffDraft, setStaffDraft] = useState(EMPTY_STAFF)
  const [orderDraft, setOrderDraft] = useState(EMPTY_ORDER)
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

      const [locationsResponse, staffResponse, ordersResponse] = await Promise.all([
        apiJson('/api/party/locations', { cache: 'no-store' }),
        apiJson('/api/party/staff', { cache: 'no-store' }),
        apiJson('/api/party/orders', { cache: 'no-store' }),
      ])
      setLocations(locationsResponse.data ?? [])
      setStaff(staffResponse.data ?? [])
      setOrders(ordersResponse.data ?? [])
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

  const addOrder = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await apiJson('/api/party/orders', {
        method: 'POST',
        body: JSON.stringify(orderDraft),
      })
      setOrders((items) => [response.data, ...items])
      setOrderDraft(EMPTY_ORDER)
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

  const archiveOrder = async (id) => {
    setSaving(true)
    setError('')
    try {
      await apiJson(`/api/party/orders/${id}`, { method: 'DELETE' })
      setOrders((items) => items.filter((item) => item._id !== id))
    } catch (archiveError) {
      setError(getErrorMessage(archiveError))
    } finally {
      setSaving(false)
    }
  }

  const setOrderStaff = (staffId, checked) => {
    setOrderDraft((draft) => {
      if (!checked) {
        return {
          ...draft,
          assignedStaff: draft.assignedStaff.filter(
            (item) => item.staffId !== staffId
          ),
        }
      }
      if (draft.assignedStaff.some((item) => item.staffId === staffId)) {
        return draft
      }
      return {
        ...draft,
        assignedStaff: [
          ...draft.assignedStaff,
          { staffId, role: 'performer', payoutAmount: 0 },
        ],
      }
    })
  }

  const setOrderStaffPayout = (staffId, payoutAmount) => {
    setOrderDraft((draft) => ({
      ...draft,
      assignedStaff: draft.assignedStaff.map((item) =>
        item.staffId === staffId ? { ...item, payoutAmount } : item
      ),
    }))
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

      <div className="p-5 mt-8 bg-white border rounded-lg border-black/10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Заказы</h2>
          <span className="text-sm text-black/55">{orders.length}</span>
        </div>

        {canManage && (
          <form onSubmit={addOrder} className="grid gap-4 mt-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="Название"
                value={orderDraft.title}
                placeholder="День рождения"
                onChange={(value) =>
                  setOrderDraft((draft) => ({ ...draft, title: value }))
                }
              />
              <Field
                label="Клиент"
                value={orderDraft.client.name}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    client: { ...draft.client, name: value },
                  }))
                }
              />
              <Field
                label="Телефон клиента"
                value={orderDraft.client.phone}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    client: { ...draft.client, phone: value },
                  }))
                }
              />
              <Field
                label="Дата и время"
                type="datetime-local"
                value={orderDraft.eventDate}
                onChange={(value) =>
                  setOrderDraft((draft) => ({ ...draft, eventDate: value }))
                }
              />
              <Field
                label="Услуга/программа"
                value={orderDraft.serviceTitle}
                onChange={(value) =>
                  setOrderDraft((draft) => ({ ...draft, serviceTitle: value }))
                }
              />
              <SelectField
                label="Место"
                value={orderDraft.placeType}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    placeType: value,
                    locationId:
                      value === 'company_location' ? draft.locationId : '',
                  }))
                }
                options={[
                  { value: 'company_location', label: 'Точка компании' },
                  { value: 'client_address', label: 'Выезд к клиенту' },
                ]}
              />
              {orderDraft.placeType === 'company_location' ? (
                <SelectField
                  label="Точка"
                  value={orderDraft.locationId}
                  onChange={(value) =>
                    setOrderDraft((draft) => ({ ...draft, locationId: value }))
                  }
                  options={[
                    { value: '', label: 'Без точки' },
                    ...locations.map((location) => ({
                      value: location._id,
                      label: location.title,
                    })),
                  ]}
                />
              ) : (
                <Field
                  label="Адрес клиента"
                  value={orderDraft.customAddress}
                  onChange={(value) =>
                    setOrderDraft((draft) => ({
                      ...draft,
                      customAddress: value,
                    }))
                  }
                />
              )}
              <Field
                label="Сумма клиента"
                type="number"
                value={orderDraft.clientPayment.totalAmount}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    clientPayment: {
                      ...draft.clientPayment,
                      totalAmount: value,
                    },
                  }))
                }
              />
              <Field
                label="Предоплата"
                type="number"
                value={orderDraft.clientPayment.prepaidAmount}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    clientPayment: {
                      ...draft.clientPayment,
                      prepaidAmount: value,
                    },
                  }))
                }
              />
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-medium text-black/65">
                Исполнители и выплаты
              </p>
              {staff.filter((person) => person.role !== 'owner').length === 0 && (
                <p className="text-sm text-black/55">
                  Добавьте исполнителей в блоке сотрудников ниже.
                </p>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                {staff
                  .filter((person) => person.role !== 'owner')
                  .map((person) => {
                    const assigned = orderDraft.assignedStaff.find(
                      (item) => item.staffId === person._id
                    )
                    return (
                      <div
                        key={person._id}
                        className="grid gap-2 p-3 border rounded-md border-black/10"
                      >
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(assigned)}
                            onChange={(event) =>
                              setOrderStaff(person._id, event.target.checked)
                            }
                          />
                          <span>
                            {[person.secondName, person.firstName]
                              .filter(Boolean)
                              .join(' ') ||
                              person.phone ||
                              person.email ||
                              'Без имени'}
                          </span>
                        </label>
                        {assigned && (
                          <Field
                            label="Выплата"
                            type="number"
                            value={assigned.payoutAmount}
                            onChange={(value) =>
                              setOrderStaffPayout(person._id, value)
                            }
                          />
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer ui-btn ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Добавить заказ
            </button>
          </form>
        )}

        <div className="grid gap-3 mt-5">
          {orders.length === 0 && (
            <p className="text-sm text-black/55">Заказы еще не добавлены.</p>
          )}
          {orders.map((order) => {
            const location = locations.find(
              (item) => item._id === order.locationId
            )
            const payoutTotal = (order.assignedStaff ?? []).reduce(
              (sum, item) => sum + Number(item.payoutAmount || 0),
              0
            )
            return (
              <div key={order._id} className="p-4 border rounded-md border-black/10">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">
                      {order.title || order.serviceTitle || 'Заказ'}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {formatDateTime(order.eventDate)} ·{' '}
                      {order.placeType === 'company_location'
                        ? location?.title || 'Точка не выбрана'
                        : order.customAddress || 'Выездной адрес не указан'}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      Клиент: {order.client?.name || 'не указан'} ·{' '}
                      {order.client?.phone || 'телефон не указан'}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      Сумма: {formatMoney(order.clientPayment?.totalAmount)} ·
                      предоплата:{' '}
                      {formatMoney(order.clientPayment?.prepaidAmount)} ·
                      выплаты: {formatMoney(payoutTotal)}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => archiveOrder(order._id)}
                      className="text-sm cursor-pointer text-danger md:mt-1"
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 mt-5 lg:grid-cols-2">
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
