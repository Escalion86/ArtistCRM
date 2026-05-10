'use client'

import Input from '@components/Input'
import Link from 'next/link'
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
  specialization: '',
  description: '',
  role: 'performer',
}

const EMPTY_ORDER = {
  title: '',
  client: {
    name: '',
    phone: '',
  },
  eventDate: '',
  durationMinutes: '60',
  dateEnd: '',
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

const EMPTY_COMPANY = {
  title: '',
  initialLocation: {
    title: '',
    address: {
      town: '',
      street: '',
      house: '',
      room: '',
    },
  },
  initialStaff: {
    firstName: '',
    secondName: '',
    phone: '',
    email: '',
    role: 'performer',
  },
}

const ACTIVE_COMPANY_STORAGE_KEY = 'partycrm.activeCompanyId'

const getErrorMessage = (error) =>
  error?.message || 'Не удалось выполнить действие'

const getConflictMessage = (error) => {
  const conflicts = error?.payload?.conflicts
  if (!conflicts) return ''
  const parts = []
  if (conflicts.locationConflicts?.length) {
    parts.push(`точка: ${conflicts.locationConflicts.length}`)
  }
  if (conflicts.staffConflicts?.length) {
    parts.push(`исполнители: ${conflicts.staffConflicts.length}`)
  }
  return parts.length ? `Конфликты (${parts.join(', ')})` : ''
}

const primaryButtonClass =
  'px-4 py-2 text-sm font-semibold text-white transition-colors rounded-md cursor-pointer bg-sky-600 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60'

const secondaryButtonClass =
  'px-4 py-2 text-sm font-semibold transition-colors bg-white border rounded-md cursor-pointer text-sky-700 border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60'

const addButtonClass =
  'grid h-10 w-10 place-items-center rounded-md bg-sky-600 text-2xl font-semibold leading-none text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60'

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

const roleLabels = {
  owner: 'Владелец',
  admin: 'Администратор',
  performer: 'Исполнитель',
}

const specializationLabels = {
  animator: 'Аниматор',
  magician: 'Фокусник',
  host: 'Ведущий',
  photographer: 'Фотограф',
  workshop: 'Мастер-класс',
  other: 'Другое',
}

const specializationOptions = [
  { value: '', label: 'Не указана' },
  { value: 'animator', label: specializationLabels.animator },
  { value: 'magician', label: specializationLabels.magician },
  { value: 'host', label: specializationLabels.host },
  { value: 'photographer', label: specializationLabels.photographer },
  { value: 'workshop', label: specializationLabels.workshop },
  { value: 'other', label: specializationLabels.other },
]

const paymentStatusLabels = {
  none: 'Не задано',
  wait_prepayment: 'Ждем предоплату',
  prepaid: 'Предоплата внесена',
  paid: 'Оплачено',
}

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const isSameDay = (value, day) => {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return startOfDay(date).getTime() === startOfDay(day).getTime()
}

const getOrderRange = (order) => {
  const start = order.eventDate ? new Date(order.eventDate) : null
  const end = order.dateEnd ? new Date(order.dateEnd) : null
  if (!start || Number.isNaN(start.getTime())) return null
  if (!end || Number.isNaN(end.getTime())) {
    return { start, end: new Date(start.getTime() + 60 * 60 * 1000) }
  }
  return { start, end }
}

const rangesOverlap = (first, second) =>
  first && second && first.start < second.end && second.start < first.end

const getAssignedStaffIds = (order) =>
  new Set((order.assignedStaff ?? []).map((item) => String(item.staffId)))

const hasOrderConflict = (order, orders) => {
  const range = getOrderRange(order)
  if (!range) return false
  const orderStaffIds = getAssignedStaffIds(order)

  return orders.some((other) => {
    if (String(other._id) === String(order._id)) return false
    if (other.status === 'canceled' || other.status === 'closed') return false
    if (!rangesOverlap(range, getOrderRange(other))) return false

    const sameLocation =
      order.placeType === 'company_location' &&
      other.placeType === 'company_location' &&
      order.locationId &&
      String(order.locationId) === String(other.locationId)

    const otherStaffIds = getAssignedStaffIds(other)
    const sameStaff = [...orderStaffIds].some((id) => otherStaffIds.has(id))

    return Boolean(sameLocation || sameStaff)
  })
}

const getOrderPayoutTotal = (order) =>
  (order.assignedStaff ?? []).reduce(
    (sum, item) => sum + Number(item.payoutAmount || 0),
    0
  )

const buildFinanceSummary = (orders) =>
  orders.reduce(
    (summary, order) => {
      const totalAmount = Number(order.clientPayment?.totalAmount || 0)
      const prepaidAmount = Number(order.clientPayment?.prepaidAmount || 0)
      const payoutAmount = getOrderPayoutTotal(order)

      return {
        orderCount: summary.orderCount + 1,
        totalAmount: summary.totalAmount + totalAmount,
        prepaidAmount: summary.prepaidAmount + prepaidAmount,
        balanceAmount:
          summary.balanceAmount + Math.max(totalAmount - prepaidAmount, 0),
        payoutAmount: summary.payoutAmount + payoutAmount,
        grossMargin: summary.grossMargin + totalAmount - payoutAmount,
      }
    },
    {
      orderCount: 0,
      totalAmount: 0,
      prepaidAmount: 0,
      balanceAmount: 0,
      payoutAmount: 0,
      grossMargin: 0,
    }
  )

const FinanceSummary = ({ summary, flat = false }) => {
  const marginPercent =
    summary.totalAmount > 0
      ? Math.round((summary.grossMargin / summary.totalAmount) * 100)
      : 0

  const items = [
    ['Заказов', summary.orderCount],
    ['Выручка', formatMoney(summary.totalAmount)],
    ['Предоплаты', formatMoney(summary.prepaidAmount)],
    ['Остаток к получению', formatMoney(summary.balanceAmount)],
    ['Выплаты исполнителям', formatMoney(summary.payoutAmount)],
    ['Валовая маржа', `${formatMoney(summary.grossMargin)} · ${marginPercent}%`],
  ]

  if (flat) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">
              Финансы
            </p>
            <h2 className="mt-1 text-xl font-semibold">Сводка по заказам</h2>
          </div>
          <p className="text-sm text-slate-500">Без отмененных заказов</p>
        </div>
        <div className="grid gap-px mt-5 overflow-hidden border rounded-lg border-sky-100 bg-sky-100 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([title, value]) => (
            <div key={title} className="p-4 bg-white">
              <p className="text-sm text-slate-500">{title}</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      id="finance"
      className="p-5 mt-8 scroll-mt-6 bg-white border rounded-lg shadow-sm border-sky-100 shadow-sky-950/5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-sky-700">
            Финансы
          </p>
          <h2 className="mt-1 text-xl font-semibold">Сводка по заказам</h2>
        </div>
        <p className="text-sm text-slate-500">Без отмененных заказов</p>
      </div>
      <div className="grid gap-px mt-5 overflow-hidden border rounded-lg border-sky-100 bg-sky-100 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([title, value]) => (
          <div key={title} className="p-4 bg-white">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const OnboardingChecklist = ({ locations, staff, orders }) => {
  const checklist = [
    {
      title: 'Добавить первую точку',
      done: locations.length > 0,
      text: 'Укажите помещения, залы или площадки, которые нужно бронировать.',
    },
    {
      title: 'Добавить сотрудников',
      done: staff.some((person) => person.role !== 'owner'),
      text: 'Добавьте администраторов и исполнителей, которых будете назначать на заказы.',
    },
    {
      title: 'Создать первый заказ',
      done: orders.length > 0,
      text: 'Проверьте путь от заявки до места, исполнителей, суммы клиента и выплат.',
    },
  ]
  const completed = checklist.filter((item) => item.done).length

  if (completed === checklist.length) return null

  return (
    <div className="p-5 mt-8 bg-white border rounded-lg shadow-sm border-sky-100 shadow-sky-950/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-sky-700">
            Быстрый старт
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            Настройте рабочее пространство
          </h2>
        </div>
        <span className="text-sm font-medium text-slate-500">
          {completed} из {checklist.length}
        </span>
      </div>
      <div className="grid gap-3 mt-5 md:grid-cols-3">
        {checklist.map((item) => (
          <div
            key={item.title}
            className={`p-4 border rounded-md ${
              item.done
                ? 'border-emerald-100 bg-emerald-50/70'
                : 'border-sky-100 bg-sky-50/40'
            }`}
          >
            <p className="font-semibold">
              {item.done ? 'Готово: ' : ''}
              {item.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}) => {
  if (type === 'phone') {
    return (
      <Input
        label={label}
        value={value}
        onChange={onChange}
        type="phone"
        className="w-full"
        noMargin
      />
    )
  }

  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-black/65">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 px-3 bg-white border rounded-md outline-none border-sky-100 focus:border-sky-500"
      />
    </label>
  )
}

const SelectField = ({ label, value, onChange, options }) => (
  <label className="grid gap-1 text-sm">
    <span className="font-medium text-black/65">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 px-3 bg-white border rounded-md outline-none cursor-pointer border-sky-100 focus:border-sky-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

const TextareaField = ({ label, value, onChange, placeholder = '' }) => (
  <label className="grid gap-1 text-sm">
    <span className="font-medium text-black/65">{label}</span>
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      className="px-3 py-2 bg-white border rounded-md outline-none resize-y border-sky-100 focus:border-sky-500"
    />
  </label>
)

const PartyFormModal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6">
    <div className="w-full max-w-4xl rounded-lg border border-sky-100 bg-white shadow-xl shadow-slate-950/20">
      <div className="flex items-center justify-between gap-3 border-b border-sky-100 px-5 py-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-sky-100 text-xl leading-none text-slate-500 transition-colors hover:bg-sky-50 hover:text-slate-900"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
)

const buildCompanyRequestOptions = (companyId, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers ?? {}),
    ...(companyId ? { 'x-partycrm-company-id': companyId } : {}),
  },
})

export default function CompanyWorkspaceClient({ section = 'overview' }) {
  const [context, setContext] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [activeCompanyId, setActiveCompanyId] = useState('')
  const [locations, setLocations] = useState([])
  const [staff, setStaff] = useState([])
  const [orders, setOrders] = useState([])
  const [locationDraft, setLocationDraft] = useState(EMPTY_LOCATION)
  const [staffDraft, setStaffDraft] = useState(EMPTY_STAFF)
  const [orderDraft, setOrderDraft] = useState(EMPTY_ORDER)
  const [companyDraft, setCompanyDraft] = useState(EMPTY_COMPANY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflictInfo, setConflictInfo] = useState('')
  const [activeModal, setActiveModal] = useState('')
  const [accessStatus, setAccessStatus] = useState('loading')
  const [orderFilter, setOrderFilter] = useState('all')

  const hasAccess = Boolean(context?.tenantId && context?.staff)
  const canManage = ['owner', 'admin'].includes(context?.role)

  const loadWorkspace = useCallback(async (preferredCompanyId = '') => {
    setLoading(true)
    setError('')
    try {
      const membershipsResponse = await apiJson('/api/party/memberships', {
        cache: 'no-store',
      })
      const availableMemberships = membershipsResponse.data?.memberships ?? []
      setMemberships(availableMemberships)

      if (availableMemberships.length === 0) {
        setContext(null)
        setLocations([])
        setStaff([])
        setOrders([])
        setActiveCompanyId('')
        setAccessStatus('not_configured')
        return
      }

      const storedCompanyId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY) || ''
          : ''
      const requestedCompanyId = preferredCompanyId || storedCompanyId
      const selectedMembership =
        availableMemberships.find(
          (membership) => membership.tenantId === requestedCompanyId
        ) ||
        availableMemberships.find((membership) => membership.isAdmin) ||
        availableMemberships[0]
      const selectedCompanyId = selectedMembership.tenantId

      setActiveCompanyId(selectedCompanyId)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, selectedCompanyId)
      }
      setContext({
        tenantId: selectedMembership.tenantId,
        role: selectedMembership.role,
        staff: selectedMembership.staff,
        company: selectedMembership.company,
      })
      setAccessStatus('ready')

      const [locationsResponse, staffResponse, ordersResponse] = await Promise.all([
        apiJson(
          '/api/party/locations',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/staff',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/orders',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
      ])
      setLocations(locationsResponse.data ?? [])
      setStaff(staffResponse.data ?? [])
      setOrders(ordersResponse.data ?? [])
    } catch (loadError) {
      if (loadError.status === 401) {
        setContext(null)
        setAccessStatus('unauthenticated')
      } else if (loadError.status === 403) {
        setContext(null)
        setAccessStatus('not_configured')
      } else {
        setAccessStatus('error')
        setError(getErrorMessage(loadError))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const switchCompany = (companyId) => {
    setActiveCompanyId(companyId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId)
    }
    loadWorkspace(companyId)
  }

  const financeSummary = useMemo(() => buildFinanceSummary(orders), [orders])

  const orderFilters = useMemo(() => {
    const today = new Date()
    const tomorrow = addDays(today, 1)
    const filterChecks = {
      all: () => true,
      new: (order) => order.status === 'draft',
      without_staff: (order) => (order.assignedStaff ?? []).length === 0,
      conflict: (order) => hasOrderConflict(order, orders),
      wait_prepayment: (order) =>
        order.clientPayment?.status === 'wait_prepayment' ||
        (Number(order.clientPayment?.totalAmount || 0) > 0 &&
          Number(order.clientPayment?.prepaidAmount || 0) <= 0 &&
          order.clientPayment?.status !== 'paid'),
      today: (order) => isSameDay(order.eventDate, today),
      tomorrow: (order) => isSameDay(order.eventDate, tomorrow),
    }

    return [
      { value: 'all', label: 'Все', count: orders.length },
      {
        value: 'new',
        label: 'Новые',
        count: orders.filter(filterChecks.new).length,
      },
      {
        value: 'without_staff',
        label: 'Без исполнителя',
        count: orders.filter(filterChecks.without_staff).length,
      },
      {
        value: 'conflict',
        label: 'Конфликты',
        count: orders.filter(filterChecks.conflict).length,
      },
      {
        value: 'wait_prepayment',
        label: 'Ждем предоплату',
        count: orders.filter(filterChecks.wait_prepayment).length,
      },
      {
        value: 'today',
        label: 'Сегодня',
        count: orders.filter(filterChecks.today).length,
      },
      {
        value: 'tomorrow',
        label: 'Завтра',
        count: orders.filter(filterChecks.tomorrow).length,
      },
    ]
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    const activeFilter = orderFilters.find((item) => item.value === orderFilter)
    if (!activeFilter) return orders
    const today = new Date()
    const tomorrow = addDays(today, 1)

    return orders.filter((order) => {
      if (orderFilter === 'new') return order.status === 'draft'
      if (orderFilter === 'without_staff') {
        return (order.assignedStaff ?? []).length === 0
      }
      if (orderFilter === 'conflict') return hasOrderConflict(order, orders)
      if (orderFilter === 'wait_prepayment') {
        return (
          order.clientPayment?.status === 'wait_prepayment' ||
          (Number(order.clientPayment?.totalAmount || 0) > 0 &&
            Number(order.clientPayment?.prepaidAmount || 0) <= 0 &&
            order.clientPayment?.status !== 'paid')
        )
      }
      if (orderFilter === 'today') return isSameDay(order.eventDate, today)
      if (orderFilter === 'tomorrow') {
        return isSameDay(order.eventDate, tomorrow)
      }
      return true
    })
  }, [orderFilter, orderFilters, orders])

  const bootstrapCompany = async () => {
    setSaving(true)
    setError('')
    try {
      await apiJson('/api/party/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          title: companyDraft.title.trim() || 'Моя компания',
          initialLocation: companyDraft.initialLocation,
          initialStaff: companyDraft.initialStaff,
        }),
      })
      await loadWorkspace()
    } catch (bootstrapError) {
      if (bootstrapError.status === 401) {
        setAccessStatus('unauthenticated')
      } else {
        setError(getErrorMessage(bootstrapError))
      }
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
        headers: activeCompanyId
          ? { 'x-partycrm-company-id': activeCompanyId }
          : undefined,
        body: JSON.stringify(locationDraft),
      })
      setLocations((items) => [...items, response.data])
      setLocationDraft(EMPTY_LOCATION)
      setActiveModal('')
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
        headers: activeCompanyId
          ? { 'x-partycrm-company-id': activeCompanyId }
          : undefined,
        body: JSON.stringify(staffDraft),
      })
      setStaff((items) => [...items, response.data])
      setStaffDraft(EMPTY_STAFF)
      setActiveModal('')
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const buildOrderPayload = () => {
    const eventDate = orderDraft.eventDate ? new Date(orderDraft.eventDate) : null
    const durationMinutes = Math.max(15, Number(orderDraft.durationMinutes || 60))
    const dateEnd =
      eventDate && !Number.isNaN(eventDate.getTime())
        ? new Date(eventDate.getTime() + durationMinutes * 60 * 1000)
        : null

    return {
      ...orderDraft,
      dateEnd: dateEnd?.toISOString() ?? '',
    }
  }

  const addOrder = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setConflictInfo('')
    try {
      const response = await apiJson('/api/party/orders', {
        method: 'POST',
        headers: activeCompanyId
          ? { 'x-partycrm-company-id': activeCompanyId }
          : undefined,
        body: JSON.stringify(buildOrderPayload()),
      })
      setOrders((items) => [response.data, ...items])
      setOrderDraft(EMPTY_ORDER)
      setActiveModal('')
    } catch (saveError) {
      setError(getConflictMessage(saveError) || getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const checkOrderConflicts = async () => {
    setSaving(true)
    setError('')
    setConflictInfo('')
    try {
      const response = await apiJson('/api/party/orders/check-conflicts', {
        method: 'POST',
        headers: activeCompanyId
          ? { 'x-partycrm-company-id': activeCompanyId }
          : undefined,
        body: JSON.stringify(buildOrderPayload()),
      })
      if (response.data?.hasConflicts) {
        const conflicts = response.data.conflicts
        const locationCount = conflicts.locationConflicts?.length || 0
        const staffCount = conflicts.staffConflicts?.length || 0
        setConflictInfo(
          `Есть конфликты: точка ${locationCount}, исполнители ${staffCount}`
        )
      } else {
        setConflictInfo('Конфликтов не найдено')
      }
    } catch (checkError) {
      setError(getErrorMessage(checkError))
    } finally {
      setSaving(false)
    }
  }

  const archiveLocation = async (id) => {
    setSaving(true)
    setError('')
    try {
      await apiJson(
        `/api/party/locations/${id}`,
        buildCompanyRequestOptions(activeCompanyId, { method: 'DELETE' })
      )
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
      await apiJson(
        `/api/party/staff/${id}`,
        buildCompanyRequestOptions(activeCompanyId, { method: 'DELETE' })
      )
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
      await apiJson(
        `/api/party/orders/${id}`,
        buildCompanyRequestOptions(activeCompanyId, { method: 'DELETE' })
      )
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
        <p className="text-sm text-black/60">Загружаем кабинет PartyCRM...</p>
      </section>
    )
  }

  if (accessStatus === 'unauthenticated') {
    return (
      <section className="max-w-6xl px-5 py-10 mx-auto">
        <p className="text-sm font-semibold uppercase text-sky-700">
          Кабинет компании
        </p>
        <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
          Сначала войдите в аккаунт
        </h1>
        <p className="max-w-2xl mt-4 leading-7 text-black/70">
          Для создания компании и доступа к PartyCRM нужен аккаунт. После входа
          вернитесь в кабинет компании и создайте рабочее пространство.
        </p>
        {error && (
          <div className="max-w-2xl p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
            {error}
          </div>
        )}
        <Link
          href="/party/login?callbackUrl=/company"
          className={`inline-flex mt-6 ${primaryButtonClass}`}
        >
          Войти или зарегистрироваться
        </Link>
      </section>
    )
  }

  if (accessStatus === 'error') {
    return (
      <section className="max-w-6xl px-5 py-10 mx-auto">
        <p className="text-sm font-semibold uppercase text-sky-700">
          Кабинет компании
        </p>
        <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
          Не удалось открыть PartyCRM
        </h1>
        <div className="max-w-2xl p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
          {error || 'Ошибка загрузки кабинета компании'}
        </div>
        <button
          type="button"
          onClick={loadWorkspace}
          className={`mt-6 ${secondaryButtonClass}`}
        >
          Повторить
        </button>
      </section>
    )
  }

  if (!hasAccess) {
    return (
      <section className="max-w-6xl px-5 py-10 mx-auto">
        <p className="text-sm font-semibold uppercase text-sky-700">
          Первый запуск
        </p>
        <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
          Создайте рабочее пространство
        </h1>
        <p className="max-w-2xl mt-4 leading-7 text-black/70">
          Укажите название компании. После создания вы станете владельцем и
          сможете сразу начать работу: первая точка и сотрудник необязательны,
          но помогут быстрее собрать рабочий кабинет.
        </p>
        {error && (
          <div className="max-w-2xl p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
            {error}
          </div>
        )}
        <form
          className="grid max-w-xl gap-4 p-5 mt-6 bg-white border rounded-lg shadow-sm border-sky-100 shadow-sky-950/5"
          onSubmit={(event) => {
            event.preventDefault()
            bootstrapCompany()
          }}
        >
          <Field
            label="Название компании"
            value={companyDraft.title}
            placeholder="Например, Веселый праздник"
            onChange={(value) =>
              setCompanyDraft((draft) => ({ ...draft, title: value }))
            }
          />
          <div className="grid gap-3 pt-4 border-t border-sky-100">
            <div>
              <p className="font-semibold">Первая точка</p>
              <p className="mt-1 text-sm text-slate-500">
                Можно пропустить и добавить позже.
              </p>
            </div>
            <Field
              label="Название точки"
              value={companyDraft.initialLocation.title}
              placeholder="Игровая на Мира"
              onChange={(value) =>
                setCompanyDraft((draft) => ({
                  ...draft,
                  initialLocation: {
                    ...draft.initialLocation,
                    title: value,
                  },
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Город"
                value={companyDraft.initialLocation.address.town}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialLocation: {
                      ...draft.initialLocation,
                      address: {
                        ...draft.initialLocation.address,
                        town: value,
                      },
                    },
                  }))
                }
              />
              <Field
                label="Улица"
                value={companyDraft.initialLocation.address.street}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialLocation: {
                      ...draft.initialLocation,
                      address: {
                        ...draft.initialLocation.address,
                        street: value,
                      },
                    },
                  }))
                }
              />
              <Field
                label="Дом"
                value={companyDraft.initialLocation.address.house}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialLocation: {
                      ...draft.initialLocation,
                      address: {
                        ...draft.initialLocation.address,
                        house: value,
                      },
                    },
                  }))
                }
              />
              <Field
                label="Зал/комната"
                value={companyDraft.initialLocation.address.room}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialLocation: {
                      ...draft.initialLocation,
                      address: {
                        ...draft.initialLocation.address,
                        room: value,
                      },
                    },
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-3 pt-4 border-t border-sky-100">
            <div>
              <p className="font-semibold">Первый сотрудник</p>
              <p className="mt-1 text-sm text-slate-500">
                Добавьте администратора или исполнителя, если данные уже есть.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Имя"
                value={companyDraft.initialStaff.firstName}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialStaff: { ...draft.initialStaff, firstName: value },
                  }))
                }
              />
              <Field
                label="Фамилия"
                value={companyDraft.initialStaff.secondName}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialStaff: { ...draft.initialStaff, secondName: value },
                  }))
                }
              />
              <Field
                label="Телефон"
                type="phone"
                value={companyDraft.initialStaff.phone}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialStaff: { ...draft.initialStaff, phone: value },
                  }))
                }
              />
              <Field
                label="Email"
                type="email"
                value={companyDraft.initialStaff.email}
                onChange={(value) =>
                  setCompanyDraft((draft) => ({
                    ...draft,
                    initialStaff: { ...draft.initialStaff, email: value },
                  }))
                }
              />
            </div>
            <SelectField
              label="Роль"
              value={companyDraft.initialStaff.role}
              onChange={(value) =>
                setCompanyDraft((draft) => ({
                  ...draft,
                  initialStaff: { ...draft.initialStaff, role: value },
                }))
              }
              options={[
                { value: 'performer', label: 'Исполнитель' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
          </div>
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Создаем...' : 'Создать компанию'}
          </button>
        </form>
      </section>
    )
  }

  const showOverview = section === 'overview'
  const showOrders = section === 'orders'
  const showFinance = section === 'finance' || showOverview
  const showLocations = section === 'locations'
  const showStaff = section === 'staff'
  const isFinancePage = section === 'finance'
  const isWorkspaceSection =
    showOrders || showLocations || showStaff || isFinancePage

  return (
    <section
      className={`px-5 py-8 ${
        isWorkspaceSection ? 'bg-white' : 'mx-auto max-w-6xl'
      }`}
      style={isWorkspaceSection ? { minHeight: 'calc(100dvh - 4rem)' } : undefined}
    >
      {memberships.length > 1 && (
        <div className="flex justify-end">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-black/65">Компания</span>
            <select
              value={activeCompanyId}
              onChange={(event) => switchCompany(event.target.value)}
              className="h-10 px-3 bg-white border rounded-md outline-none cursor-pointer min-w-56 border-sky-100 focus:border-sky-500"
            >
              {memberships.map((membership) => (
                <option key={membership.staffId} value={membership.tenantId}>
                  {membership.company?.title || 'Компания'} ·{' '}
                  {roleLabels[membership.role] || membership.role}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <div className="p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
          {error}
        </div>
      )}

      {showOverview && (
        <OnboardingChecklist
          locations={locations}
          staff={staff}
          orders={orders}
        />
      )}

      {showFinance && (
        <FinanceSummary summary={financeSummary} flat={isFinancePage} />
      )}

      {showOrders && (
        <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Заказы</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-black/55">{orders.length}</span>
            {canManage && (
              <button
                type="button"
                onClick={() => setActiveModal('order')}
                className={addButtonClass}
                aria-label="Создать заказ"
                title="Создать заказ"
              >
                +
              </button>
            )}
          </div>
        </div>

        {canManage && activeModal === 'order' && (
          <PartyFormModal title="Новый заказ" onClose={() => setActiveModal('')}>
            <form onSubmit={addOrder} className="grid gap-4">
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
                type="phone"
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
                label="Длительность, мин"
                type="number"
                value={orderDraft.durationMinutes}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    durationMinutes: value,
                  }))
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
              <SelectField
                label="Статус оплаты"
                value={orderDraft.clientPayment.status}
                onChange={(value) =>
                  setOrderDraft((draft) => ({
                    ...draft,
                    clientPayment: {
                      ...draft.clientPayment,
                      status: value,
                    },
                  }))
                }
                options={[
                  { value: 'none', label: paymentStatusLabels.none },
                  {
                    value: 'wait_prepayment',
                    label: paymentStatusLabels.wait_prepayment,
                  },
                  { value: 'prepaid', label: paymentStatusLabels.prepaid },
                  { value: 'paid', label: paymentStatusLabels.paid },
                ]}
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
                        className="grid gap-2 p-3 border rounded-md border-sky-100 bg-sky-50/35"
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
              className={primaryButtonClass}
            >
              Добавить заказ
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={checkOrderConflicts}
              className={secondaryButtonClass}
            >
              Проверить конфликты
            </button>
            {conflictInfo && (
              <p className="text-sm font-medium text-black/65">
                {conflictInfo}
              </p>
            )}
            </form>
          </PartyFormModal>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          {orderFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setOrderFilter(filter.value)}
              className={`px-3 py-2 text-sm font-semibold transition-colors border rounded-md cursor-pointer ${
                orderFilter === filter.value
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-sky-100 bg-white text-slate-700 hover:bg-sky-50'
              }`}
            >
              {filter.label}
              <span
                className={`ml-2 ${
                  orderFilter === filter.value ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 mt-5">
          {orders.length === 0 && (
            <p className="text-sm text-black/55">Заказы еще не добавлены.</p>
          )}
          {orders.length > 0 && filteredOrders.length === 0 && (
            <p className="text-sm text-black/55">
              По выбранному фильтру заказов нет.
            </p>
          )}
          {filteredOrders.map((order) => {
            const location = locations.find(
              (item) => item._id === order.locationId
            )
            const payoutTotal = getOrderPayoutTotal(order)
            const hasConflict = hasOrderConflict(order, orders)
            return (
              <div key={order._id} className="p-4 border rounded-md border-sky-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {order.title || order.serviceTitle || 'Заказ'}
                      </p>
                      {hasConflict && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-danger/10 text-danger">
                          Конфликт
                        </span>
                      )}
                      {(order.assignedStaff ?? []).length === 0 && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-700">
                          Без исполнителя
                        </span>
                      )}
                    </div>
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
                      статус:{' '}
                      {paymentStatusLabels[order.clientPayment?.status] ||
                        paymentStatusLabels.none}{' '}
                      ·
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
      )}

      {(showLocations || showStaff) && (
        <div className="mx-auto max-w-6xl">
          {showLocations && (
        <div id="locations" className="scroll-mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Точки</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-black/55">{locations.length}</span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setActiveModal('location')}
                  className={addButtonClass}
                  aria-label="Добавить точку"
                  title="Добавить точку"
                >
                  +
                </button>
              )}
            </div>
          </div>

          {canManage && activeModal === 'location' && (
            <PartyFormModal title="Новая точка" onClose={() => setActiveModal('')}>
              <form onSubmit={addLocation} className="grid gap-3">
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
                className={primaryButtonClass}
              >
                Добавить точку
              </button>
              </form>
            </PartyFormModal>
          )}

          <div className="grid gap-3 mt-5">
            {locations.length === 0 && (
              <p className="text-sm text-black/55">Точки еще не добавлены.</p>
            )}
            {locations.map((location) => (
              <div
                key={location._id}
                className="p-4 border rounded-md border-sky-100"
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
          )}

          {showStaff && (
        <div id="staff" className="scroll-mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Сотрудники</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-black/55">{staff.length}</span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setActiveModal('staff')}
                  className={addButtonClass}
                  aria-label="Добавить сотрудника"
                  title="Добавить сотрудника"
                >
                  +
                </button>
              )}
            </div>
          </div>

          {canManage && activeModal === 'staff' && (
            <PartyFormModal
              title="Новый сотрудник"
              onClose={() => setActiveModal('')}
            >
              <form onSubmit={addStaff} className="grid gap-3">
              <p className="text-sm leading-6 text-slate-500">
                Карточка без привязанного аккаунта считается подрядчиком. Для
                такой карточки нужны имя и телефон; пригласить в систему можно
                будет следующим шагом.
              </p>
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
                  type="phone"
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
              <div className="grid gap-3 sm:grid-cols-2">
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
                <SelectField
                  label="Специализация"
                  value={staffDraft.specialization}
                  onChange={(value) =>
                    setStaffDraft((draft) => ({
                      ...draft,
                      specialization: value,
                    }))
                  }
                  options={specializationOptions}
                />
              </div>
              <TextareaField
                label="Описание"
                value={staffDraft.description}
                placeholder="Например, работает с детьми 4-8 лет, ведет бумажное шоу и квесты"
                onChange={(value) =>
                  setStaffDraft((draft) => ({ ...draft, description: value }))
                }
              />
              <button
                type="submit"
                disabled={saving}
                className={primaryButtonClass}
              >
                Добавить сотрудника
              </button>
              </form>
            </PartyFormModal>
          )}

          <div className="grid gap-3 mt-5">
            {staff.length === 0 && (
              <p className="text-sm text-black/55">
                Сотрудники еще не добавлены.
              </p>
            )}
            {staff.map((person) => (
              <div key={person._id} className="p-4 border rounded-md border-sky-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {[person.secondName, person.firstName].filter(Boolean).join(' ') ||
                        person.phone ||
                        person.email ||
                        'Без имени'}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {roleLabels[person.role] || person.role} · {[person.phone, person.email].filter(Boolean).join(' · ') ||
                        'контакты не указаны'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {!person.authUserId && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-700">
                          Подрядчик без аккаунта
                        </span>
                      )}
                      {person.specialization && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-sky-50 text-sky-700">
                          {specializationLabels[person.specialization] ||
                            person.specialization}
                        </span>
                      )}
                    </div>
                    {person.description && (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {person.description}
                      </p>
                    )}
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
          )}
      </div>
      )}
    </section>
  )
}
