'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiJson } from '@helpers/apiClient'

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

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString('ru-RU')} ₽`

const confirmationLabels = {
  pending: 'Ждет подтверждения',
  confirmed: 'Участие подтверждено',
  declined: 'Участие отклонено',
  done: 'Выполнено',
}

const primaryButtonClass =
  'px-4 py-2 text-sm font-semibold text-white transition-colors rounded-md cursor-pointer bg-sky-600 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60'

const secondaryButtonClass =
  'px-4 py-2 text-sm font-semibold transition-colors bg-white border rounded-md cursor-pointer text-sky-700 border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60'

const getAddressText = (order) => {
  if (order.placeType === 'client_address') {
    return order.customAddress || 'Выездной адрес не указан'
  }
  const address = order.location?.address
  const addressText = address
    ? [address.town, address.street, address.house, address.room]
        .filter(Boolean)
        .join(', ')
    : ''
  return [order.location?.title, addressText].filter(Boolean).join(' · ') ||
    'Точка не указана'
}

export default function PerformerWorkspaceClient() {
  const [context, setContext] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingOrderId, setSavingOrderId] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [me, ordersResponse] = await Promise.all([
        apiJson('/api/party/me', { cache: 'no-store' }),
        apiJson('/api/party/performer/orders', { cache: 'no-store' }),
      ])
      setContext(me.data)
      setOrders(ordersResponse.data ?? [])
    } catch (loadError) {
      setError(loadError.message || 'Не удалось загрузить кабинет исполнителя')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const payoutTotal = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + Number(order.assignment?.payoutAmount || 0),
        0
      ),
    [orders]
  )

  const updateConfirmationStatus = async (orderId, confirmationStatus) => {
    setSavingOrderId(orderId)
    setError('')
    try {
      const response = await apiJson(
        `/api/party/performer/orders/${orderId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ confirmationStatus }),
        }
      )
      setOrders((items) =>
        items.map((order) =>
          order._id === orderId
            ? {
                ...order,
                assignment: {
                  ...order.assignment,
                  confirmationStatus: response.data.confirmationStatus,
                },
              }
            : order
        )
      )
    } catch (saveError) {
      setError(saveError.message || 'Не удалось обновить статус участия')
    } finally {
      setSavingOrderId('')
    }
  }

  if (loading) {
    return (
      <section className="max-w-5xl px-5 py-10 mx-auto">
        <p className="text-sm text-black/60">Загружаем заказы исполнителя...</p>
      </section>
    )
  }

  return (
    <section className="max-w-5xl px-5 py-10 mx-auto">
      <p className="text-sm font-semibold uppercase text-sky-700">
        Кабинет исполнителя
      </p>
      <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
        Кабинет исполнителя
      </h1>
      <p className="max-w-2xl mt-4 leading-7 text-slate-700">
        Видны только назначенные заказы и сумма выплаты исполнителю. Полная
        клиентская смета здесь не показывается.
      </p>

      {error && (
        <div className="p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 overflow-hidden bg-white border rounded-lg shadow-sm border-sky-100 shadow-sky-950/5">
        <div className="grid gap-px bg-sky-100 sm:grid-cols-3">
          {[
            ['Компания', context?.company?.title || 'PartyCRM'],
            ['Назначено', `${orders.length} заказов`],
            ['К выплате', formatMoney(payoutTotal)],
          ].map(([title, value]) => (
            <div key={title} className="p-5 bg-white">
              <p className="text-sm text-black/55">{title}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 mt-6">
        {orders.length === 0 && (
          <div className="p-5 bg-white border rounded-lg shadow-sm border-sky-100 shadow-sky-950/5">
            <p className="text-sm text-black/60">
              Назначенных заказов пока нет.
            </p>
          </div>
        )}
        {orders.map((order) => {
          const confirmationStatus =
            order.assignment?.confirmationStatus || 'pending'
          const isSaving = savingOrderId === order._id
          return (
            <div
              key={order._id}
              className="p-5 bg-white border rounded-lg shadow-sm border-sky-100 shadow-sky-950/5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">{order.title}</p>
                  <p className="mt-1 text-sm text-black/60">
                    {formatDateTime(order.eventDate)}
                  </p>
                  <p className="mt-1 text-sm text-black/60">
                    {getAddressText(order)}
                  </p>
                  <p className="mt-1 text-sm text-black/60">
                    Клиент: {order.client?.name || 'не указан'} ·{' '}
                    {order.client?.phone || 'телефон не указан'}
                  </p>
                  {order.adminComment && (
                    <p className="mt-2 text-sm text-black/70">
                      {order.adminComment}
                    </p>
                  )}
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-black/55">Выплата</p>
                  <p className="text-2xl font-semibold">
                    {formatMoney(order.assignment?.payoutAmount)}
                  </p>
                  <p className="mt-1 text-xs text-black/50">
                    {confirmationLabels[confirmationStatus] || confirmationStatus}
                  </p>
                  <div className="flex flex-col gap-2 mt-4 sm:items-end">
                    {confirmationStatus === 'pending' && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          updateConfirmationStatus(order._id, 'confirmed')
                        }
                        className={primaryButtonClass}
                      >
                        Подтвердить участие
                      </button>
                    )}
                    {confirmationStatus !== 'done' && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          updateConfirmationStatus(order._id, 'done')
                        }
                        className={secondaryButtonClass}
                      >
                        Отметить выполненным
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
