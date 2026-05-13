'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiJson } from '@helpers/apiClient'
import OrdersList from '@components/party/lists/OrdersList'
import ClientsList from '@components/party/lists/ClientsList'
import StaffList from '@components/party/lists/StaffList'
import LocationsList from '@components/party/lists/LocationsList'
import OrderModal from '@components/party/modals/OrderModal'
import { ClientFormModal } from '@components/party/modals/ClientModal'
import StaffModal from '@components/party/modals/StaffModal'
import LocationModal from '@components/party/modals/LocationModal'
import {
  EMPTY_ORDER,
  EMPTY_STAFF,
  EMPTY_LOCATION,
  EMPTY_PARTY_CLIENT,
  roleLabels,
  paymentStatusLabels,
} from '@helpers/partyHelpers'
import getPersonFullName from '@helpers/getPersonFullName'
import { formatMoney } from '@helpers/formatMoney'

const ACTIVE_COMPANY_STORAGE_KEY = 'partycrm.activeCompanyId'

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

const getOrderPayoutTotal = (order) =>
  (order.assignedStaff ?? []).reduce(
    (sum, item) => sum + Number(item.payoutAmount || 0),
    0
  )

const getOrderContractAmount = (order) =>
  Number(order.contractAmount ?? order.clientPayment?.totalAmount ?? 0)

const getOrderTransactionTotal = (order, type) =>
  (order.transactions ?? [])
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

const hasOpenAdditionalEvents = (order) =>
  (order.additionalEvents ?? []).some((item) => !item.done)

const normalizeOrderDraft = (order) => ({
  ...order,
  contractAmount:
    order.contractAmount ?? order.clientPayment?.totalAmount ?? '',
  transactions: Array.isArray(order.transactions) ? order.transactions : [],
  additionalEvents: Array.isArray(order.additionalEvents)
    ? order.additionalEvents
    : [],
})

const getAssignedStaffIds = (order) =>
  new Set((order.assignedStaff ?? []).map((item) => String(item.staffId)))

const rangesOverlap = (first, second) =>
  first && second && first.start < second.end && second.start < first.end

const getOrderRange = (order) => {
  const start = order.eventDate ? new Date(order.eventDate) : null
  const end = order.dateEnd ? new Date(order.dateEnd) : null
  if (!start || Number.isNaN(start.getTime())) return null
  if (!end || Number.isNaN(end.getTime())) {
    return { start, end: new Date(start.getTime() + 60 * 60 * 1000) }
  }
  return { start, end }
}

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

const buildFinanceSummary = (orders) =>
  orders.reduce(
    (summary, order) => {
      const contractAmount = getOrderContractAmount(order)
      const incomeAmount = getOrderTransactionTotal(order, 'income')
      const expenseAmount = getOrderTransactionTotal(order, 'expense')
      const payoutAmount = getOrderPayoutTotal(order)

      return {
        orderCount: summary.orderCount + 1,
        contractAmount: summary.contractAmount + contractAmount,
        incomeAmount: summary.incomeAmount + incomeAmount,
        expenseAmount: summary.expenseAmount + expenseAmount,
        balanceAmount:
          summary.balanceAmount + Math.max(contractAmount - incomeAmount, 0),
        payoutAmount: summary.payoutAmount + payoutAmount,
        grossMargin:
          summary.grossMargin + incomeAmount - expenseAmount - payoutAmount,
      }
    },
    {
      orderCount: 0,
      contractAmount: 0,
      incomeAmount: 0,
      expenseAmount: 0,
      balanceAmount: 0,
      payoutAmount: 0,
      grossMargin: 0,
    }
  )

const buildCompanyRequestOptions = (companyId, options = {}) => ({
  ...options,
  headers: {
    ...(options.headers ?? {}),
    ...(companyId ? { 'x-partycrm-company-id': companyId } : {}),
  },
})

export default function CompanyWorkspaceClient({ section = 'overview' }) {
  const router = useRouter()
  const [context, setContext] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [activeCompanyId, setActiveCompanyId] = useState('')
  const [locations, setLocations] = useState([])
  const [archivedLocations, setArchivedLocations] = useState([])
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [services, setServices] = useState([])
  const [orders, setOrders] = useState([])
  const [orderDraft, setOrderDraft] = useState(EMPTY_ORDER)
  const [clientDraft, setClientDraft] = useState(EMPTY_PARTY_CLIENT)
  const [staffDraft, setStaffDraft] = useState(EMPTY_STAFF)
  const [locationDraft, setLocationDraft] = useState(EMPTY_LOCATION)
  const [editingLocationId, setEditingLocationId] = useState('')
  const [editingClientId, setEditingClientId] = useState('')
  const [editingOrderId, setEditingOrderId] = useState('')
  const [editingStaffId, setEditingStaffId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflictInfo, setConflictInfo] = useState('')
  const [activeModal, setActiveModal] = useState('')
  const [accessStatus, setAccessStatus] = useState('loading')
  const [orderFilter, setOrderFilter] = useState('all')
  const [clientSearch, setClientSearch] = useState('')

  const hasAccess = Boolean(context?.tenantId && context?.staff)
  const canManage = ['owner', 'admin'].includes(context?.role)

  // Load workspace data
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
        setArchivedLocations([])
        setClients([])
        setStaff([])
        setServices([])
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
        window.localStorage.setItem(
          ACTIVE_COMPANY_STORAGE_KEY,
          selectedCompanyId
        )
      }
      setContext({
        tenantId: selectedMembership.tenantId,
        role: selectedMembership.role,
        staff: selectedMembership.staff,
        company: selectedMembership.company,
      })
      setAccessStatus('ready')

      const [
        locationsResponse,
        archivedLocationsResponse,
        clientsResponse,
        staffResponse,
        servicesResponse,
        ordersResponse,
      ] = await Promise.all([
        apiJson(
          '/api/party/locations',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/locations?status=archived',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/clients',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/staff',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/services',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
        apiJson(
          '/api/party/orders',
          buildCompanyRequestOptions(selectedCompanyId, { cache: 'no-store' })
        ),
      ])
      setLocations(locationsResponse.data ?? [])
      setArchivedLocations(archivedLocationsResponse.data ?? [])
      setClients(clientsResponse.data ?? [])
      setStaff(staffResponse.data ?? [])
      setServices(servicesResponse.data ?? [])
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
        setError('Не удалось загрузить данные')
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

  const clientsById = useMemo(
    () => new Map(clients.map((client) => [String(client._id), client])),
    [clients]
  )

  const financeSummary = useMemo(() => buildFinanceSummary(orders), [orders])

  const orderFilters = useMemo(() => {
    const today = new Date()
    const tomorrow = addDays(today, 1)
    return [
      { value: 'all', label: 'Все', count: orders.length },
      {
        value: 'new',
        label: 'Новые',
        count: orders.filter((o) => o.status === 'draft').length,
      },
      {
        value: 'without_staff',
        label: 'Без исполнителя',
        count: orders.filter((o) => (o.assignedStaff ?? []).length === 0)
          .length,
      },
      {
        value: 'conflict',
        label: 'Конфликты',
        count: orders.filter((o) => hasOrderConflict(o, orders)).length,
      },
      {
        value: 'tasks',
        label: 'Есть задачи',
        count: orders.filter(hasOpenAdditionalEvents).length,
      },
      {
        value: 'today',
        label: 'Сегодня',
        count: orders.filter(
          (o) => o.eventDate && isSameDay(o.eventDate, today)
        ).length,
      },
      {
        value: 'tomorrow',
        label: 'Завтра',
        count: orders.filter(
          (o) => o.eventDate && isSameDay(o.eventDate, tomorrow)
        ).length,
      },
    ]
  }, [orders])

  const filteredOrders = useMemo(() => {
    const today = new Date()
    const tomorrow = addDays(today, 1)
    switch (orderFilter) {
      case 'new':
        return orders.filter((o) => o.status === 'draft')
      case 'without_staff':
        return orders.filter((o) => (o.assignedStaff ?? []).length === 0)
      case 'conflict':
        return orders.filter((o) => hasOrderConflict(o, orders))
      case 'tasks':
        return orders.filter(hasOpenAdditionalEvents)
      case 'today':
        return orders.filter(
          (o) => o.eventDate && isSameDay(o.eventDate, today)
        )
      case 'tomorrow':
        return orders.filter(
          (o) => o.eventDate && isSameDay(o.eventDate, tomorrow)
        )
      default:
        return orders
    }
  }, [orders, orderFilter])

  // Order actions
  const addOrder = useCallback(async () => {
    setSaving(true)
    try {
      const response = await apiJson(
        '/api/party/orders',
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'POST',
          body: JSON.stringify(orderDraft),
        })
      )
      if (response.data) {
        setOrders((prev) => [...prev, response.data])
        setActiveModal('')
        setOrderDraft(EMPTY_ORDER)
      }
    } finally {
      setSaving(false)
    }
  }, [orderDraft, activeCompanyId])

  const editOrder = useCallback(async () => {
    if (!editingOrderId) return
    setSaving(true)
    try {
      const response = await apiJson(
        `/api/party/orders/${editingOrderId}`,
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'PATCH',
          body: JSON.stringify(orderDraft),
        })
      )
      if (response.data) {
        setOrders((prev) =>
          prev.map((o) =>
            String(o._id) === editingOrderId ? response.data : o
          )
        )
        setActiveModal('')
        setEditingOrderId('')
        setOrderDraft(EMPTY_ORDER)
      }
    } finally {
      setSaving(false)
    }
  }, [orderDraft, editingOrderId, activeCompanyId])

  const archiveOrder = useCallback(
    async (orderId) => {
      setSaving(true)
      try {
        await apiJson(
          `/api/party/orders/${orderId}`,
          buildCompanyRequestOptions(activeCompanyId, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'closed' }),
          })
        )
        setOrders((prev) =>
          prev.map((o) =>
            String(o._id) === orderId ? { ...o, status: 'closed' } : o
          )
        )
      } finally {
        setSaving(false)
      }
    },
    [activeCompanyId]
  )

  const checkOrderConflicts = useCallback(() => {
    if (hasOrderConflict(orderDraft, orders)) {
      setConflictInfo('Обнаружен конфликт по времени или исполнителям')
    } else {
      setConflictInfo('')
    }
  }, [orderDraft, orders])

  // Client actions
  const addClient = useCallback(async () => {
    setSaving(true)
    try {
      const response = await apiJson(
        '/api/party/clients',
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'POST',
          body: JSON.stringify(clientDraft),
        })
      )
      if (response.data) {
        setClients((prev) => [...prev, response.data])
        setActiveModal('')
        setClientDraft(EMPTY_PARTY_CLIENT)
      }
    } finally {
      setSaving(false)
    }
  }, [clientDraft, activeCompanyId])

  const editClient = useCallback(async () => {
    if (!editingClientId) return
    setSaving(true)
    try {
      const response = await apiJson(
        `/api/party/clients/${editingClientId}`,
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'PATCH',
          body: JSON.stringify(clientDraft),
        })
      )
      if (response.data) {
        setClients((prev) =>
          prev.map((c) =>
            String(c._id) === editingClientId ? response.data : c
          )
        )
        setActiveModal('')
        setEditingClientId('')
        setClientDraft(EMPTY_PARTY_CLIENT)
      }
    } finally {
      setSaving(false)
    }
  }, [clientDraft, editingClientId, activeCompanyId])

  // Staff actions
  const addStaff = useCallback(async () => {
    setSaving(true)
    try {
      const response = await apiJson(
        '/api/party/staff',
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'POST',
          body: JSON.stringify(staffDraft),
        })
      )
      if (response.data) {
        setStaff((prev) => [...prev, response.data])
        setActiveModal('')
        setStaffDraft(EMPTY_STAFF)
      }
    } finally {
      setSaving(false)
    }
  }, [staffDraft, activeCompanyId])

  const editStaff = useCallback(async () => {
    if (!editingStaffId) return
    setSaving(true)
    try {
      const response = await apiJson(
        `/api/party/staff/${editingStaffId}`,
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'PATCH',
          body: JSON.stringify(staffDraft),
        })
      )
      if (response.data) {
        setStaff((prev) =>
          prev.map((s) =>
            String(s._id) === editingStaffId ? response.data : s
          )
        )
        setActiveModal('')
        setEditingStaffId('')
        setStaffDraft(EMPTY_STAFF)
      }
    } finally {
      setSaving(false)
    }
  }, [staffDraft, editingStaffId, activeCompanyId])

  // Location actions
  const addLocation = useCallback(async () => {
    setSaving(true)
    try {
      const response = await apiJson(
        '/api/party/locations',
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'POST',
          body: JSON.stringify(locationDraft),
        })
      )
      if (response.data) {
        setLocations((prev) => [...prev, response.data])
        setActiveModal('')
        setLocationDraft(EMPTY_LOCATION)
      }
    } finally {
      setSaving(false)
    }
  }, [locationDraft, activeCompanyId])

  const editLocation = useCallback(async () => {
    if (!editingLocationId) return
    setSaving(true)
    try {
      const response = await apiJson(
        `/api/party/locations/${editingLocationId}`,
        buildCompanyRequestOptions(activeCompanyId, {
          method: 'PATCH',
          body: JSON.stringify(locationDraft),
        })
      )
      if (response.data) {
        setLocations((prev) =>
          prev.map((l) =>
            String(l._id) === editingLocationId ? response.data : l
          )
        )
        setActiveModal('')
        setEditingLocationId('')
        setLocationDraft(EMPTY_LOCATION)
      }
    } finally {
      setSaving(false)
    }
  }, [locationDraft, editingLocationId, activeCompanyId])

  if (accessStatus === 'loading') {
    return (
      <section className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </section>
    )
  }

  if (accessStatus === 'unauthenticated') {
    return (
      <section className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Необходимо авторизоваться</p>
        </div>
      </section>
    )
  }

  if (accessStatus === 'not_configured') {
    return (
      <section className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Нет доступных компаний</p>
        </div>
      </section>
    )
  }

  if (accessStatus === 'error') {
    return (
      <section className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">{error || 'Ошибка загрузки'}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen bg-white">
      {/* Main content */}
      <main className="max-w-6xl px-5 py-8 mx-auto">
        {section === 'overview' && (
          <>
            {/* Finance summary */}
            <div className="p-4 mb-6 rounded-2xl bg-sky-50">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-600">Заказов</p>
                  <p className="text-2xl font-bold">
                    {financeSummary.orderCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Договоры</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(financeSummary.contractAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Получено</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(financeSummary.incomeAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Выплаты</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(financeSummary.payoutAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters and actions */}
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {orderFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                      orderFilter === filter.value
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setOrderFilter(filter.value)}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold text-white rounded cursor-pointer bg-sky-600 hover:bg-sky-700"
                  onClick={() => {
                    setOrderDraft(EMPTY_ORDER)
                    setActiveModal('order')
                  }}
                >
                  Новый заказ
                </button>
              </div>
            </div>

            {/* Orders list */}
            <OrdersList
              orders={filteredOrders}
              clients={clients}
              clientsById={clientsById}
              staff={staff}
              locations={locations}
              onEdit={(order) => {
                setOrderDraft(normalizeOrderDraft(order))
                setEditingOrderId(order._id)
                setActiveModal('order-edit')
              }}
              onArchive={archiveOrder}
            />
          </>
        )}

        {section === 'orders' && (
          <>
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {orderFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                      orderFilter === filter.value
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setOrderFilter(filter.value)}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold text-white rounded cursor-pointer bg-sky-600 hover:bg-sky-700"
                  onClick={() => {
                    setOrderDraft(EMPTY_ORDER)
                    setActiveModal('order')
                  }}
                >
                  Новый заказ
                </button>
              </div>
            </div>

            <OrdersList
              orders={filteredOrders}
              clients={clients}
              clientsById={clientsById}
              staff={staff}
              locations={locations}
              onEdit={(order) => {
                setOrderDraft(normalizeOrderDraft(order))
                setEditingOrderId(order._id)
                setActiveModal('order-edit')
              }}
              onArchive={archiveOrder}
            />
          </>
        )}

        {section === 'clients' && (
          <>
            <div className="flex justify-end mb-6">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white rounded cursor-pointer bg-sky-600 hover:bg-sky-700"
                onClick={() => {
                  setClientDraft(EMPTY_PARTY_CLIENT)
                  setActiveModal('client')
                }}
              >
                Новый клиент
              </button>
            </div>
            <ClientsList
              clients={clients}
              onEdit={(client) => {
                setClientDraft(client)
                setEditingClientId(client._id)
                setActiveModal('client-edit')
              }}
            />
          </>
        )}

        {section === 'finance' && (
          <div className="p-6 rounded-2xl bg-sky-50">
            <h2 className="mb-4 text-xl font-semibold">Финансы</h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Заказов</p>
                <p className="text-2xl font-bold">
                  {financeSummary.orderCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Договорная сумма</p>
                <p className="text-2xl font-bold">
                  {formatMoney(financeSummary.contractAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Доходы</p>
                <p className="text-2xl font-bold">
                  {formatMoney(financeSummary.incomeAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Остаток по договорам</p>
                <p className="text-2xl font-bold">
                  {formatMoney(financeSummary.balanceAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Расходы</p>
                <p className="text-2xl font-bold">
                  {formatMoney(financeSummary.expenseAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Выплаты сотрудникам</p>
                <p className="text-2xl font-bold">
                  {formatMoney(financeSummary.payoutAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Маржа</p>
                <p className="text-2xl font-bold">
                  {formatMoney(financeSummary.grossMargin)}
                </p>
              </div>
            </div>
          </div>
        )}

        {section === 'locations' && (
          <>
            <div className="flex justify-end mb-6">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white rounded cursor-pointer bg-sky-600 hover:bg-sky-700"
                onClick={() => {
                  setLocationDraft(EMPTY_LOCATION)
                  setActiveModal('location')
                }}
              >
                Новая точка
              </button>
            </div>
            <LocationsList
              locations={locations}
              archivedLocations={archivedLocations}
              onEdit={(location) => {
                setLocationDraft(location)
                setEditingLocationId(location._id)
                setActiveModal('location-edit')
              }}
            />
          </>
        )}

        {section === 'staff' && (
          <>
            <div className="flex justify-end mb-6">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white rounded cursor-pointer bg-sky-600 hover:bg-sky-700"
                onClick={() => {
                  setStaffDraft(EMPTY_STAFF)
                  setActiveModal('staff')
                }}
              >
                Новый сотрудник
              </button>
            </div>
            <StaffList
              staff={staff}
              onEdit={(staffMember) => {
                setStaffDraft(staffMember)
                setEditingStaffId(staffMember._id)
                setActiveModal('staff-edit')
              }}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {activeModal === 'order' && (
        <OrderModal
          open={true}
          orderDraft={orderDraft}
          setOrderDraft={setOrderDraft}
          locations={locations}
          staff={staff}
          clients={clients}
          clientsById={clientsById}
          services={services}
          canManage={canManage}
          saving={saving}
          conflictInfo={conflictInfo}
          onClose={() => setActiveModal('')}
          onSubmit={addOrder}
          onCheckConflicts={checkOrderConflicts}
          onServiceCreated={(newService) =>
            setServices((prev) => [...prev, newService])
          }
        />
      )}

      {activeModal === 'order-edit' && (
        <OrderModal
          open={true}
          title="Редактировать заказ"
          orderDraft={orderDraft}
          setOrderDraft={setOrderDraft}
          locations={locations}
          staff={staff}
          clients={clients}
          clientsById={clientsById}
          services={services}
          canManage={canManage}
          saving={saving}
          conflictInfo={conflictInfo}
          onClose={() => {
            setActiveModal('')
            setEditingOrderId('')
          }}
          onSubmit={editOrder}
          onCheckConflicts={checkOrderConflicts}
          onServiceCreated={(newService) =>
            setServices((prev) => [...prev, newService])
          }
          isEdit
        />
      )}

      {activeModal === 'staff' && (
        <StaffModal
          open={true}
          staffDraft={staffDraft}
          setStaffDraft={setStaffDraft}
          saving={saving}
          onClose={() => setActiveModal('')}
          onSubmit={addStaff}
        />
      )}

      {activeModal === 'staff-edit' && (
        <StaffModal
          open={true}
          title="Редактировать сотрудника"
          staffDraft={staffDraft}
          setStaffDraft={setStaffDraft}
          saving={saving}
          onClose={() => {
            setActiveModal('')
            setEditingStaffId('')
          }}
          onSubmit={editStaff}
          isEdit
        />
      )}

      {(activeModal === 'location' || activeModal === 'location-edit') && (
        <LocationModal
          open={true}
          title={
            activeModal === 'location-edit'
              ? 'Редактировать точку'
              : 'Новая точка'
          }
          locationDraft={locationDraft}
          setLocationDraft={setLocationDraft}
          saving={saving}
          onClose={() => {
            setActiveModal('')
            setEditingLocationId('')
          }}
          onSubmit={
            activeModal === 'location-edit' ? editLocation : addLocation
          }
          isEdit={activeModal === 'location-edit'}
        />
      )}

      {(activeModal === 'client' || activeModal === 'client-edit') && (
        <ClientFormModal
          open={true}
          title={
            activeModal === 'client-edit'
              ? 'Редактировать клиента'
              : 'Новый клиент'
          }
          clientDraft={clientDraft}
          setClientDraft={setClientDraft}
          saving={saving}
          onClose={() => {
            setActiveModal('')
            setEditingClientId('')
          }}
          onSubmit={activeModal === 'client-edit' ? editClient : addClient}
        />
      )}
    </section>
  )
}
