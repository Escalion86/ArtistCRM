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

  if (loading) {
    return (
      <section className="max-w-5xl px-5 py-10 mx-auto">
        <p className="text-sm text-black/60">Загружаем заказы исполнителя...</p>
      </section>
    )
  }

  return (
    <section className="max-w-5xl px-5 py-10 mx-auto">
      <p className="text-sm font-semibold uppercase text-general">
        Performer workspace
      </p>
      <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
        Кабинет исполнителя
      </h1>
      <p className="max-w-2xl mt-4 leading-7 text-black/70">
        Видны только назначенные заказы и сумма выплаты исполнителю. Полная
        клиентская смета здесь не показывается.
      </p>

      {error && (
        <div className="p-3 mt-5 text-sm border rounded-md border-danger/30 bg-danger/10 text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 overflow-hidden bg-white border rounded-lg border-black/10">
        <div className="grid gap-px bg-black/10 sm:grid-cols-3">
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
          <div className="p-5 bg-white border rounded-lg border-black/10">
            <p className="text-sm text-black/60">
              Назначенных заказов пока нет.
            </p>
          </div>
        )}
        {orders.map((order) => (
          <div key={order._id} className="p-5 bg-white border rounded-lg border-black/10">
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
                  {order.assignment?.confirmationStatus || 'pending'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
