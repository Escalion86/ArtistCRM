'use client'

import { faBoxArchive } from '@fortawesome/free-solid-svg-icons'
import CardButton from '@components/CardButton'
import PartyCard, {
  PartyCardActions,
  PartyCardHeader,
} from '@components/party/PartyCard'
import { formatMoney } from '@helpers/formatMoney'
import getPersonFullName from '@helpers/getPersonFullName'

const getOrderClientLabel = (order, clientsById) => {
  const currentClient = order?.clientId
    ? clientsById.get(String(order.clientId))
    : null

  return {
    name: currentClient
      ? getPersonFullName(currentClient, { fallback: 'не указан' })
      : order?.client?.name || 'не указан',
    phone: currentClient?.phone || order?.client?.phone || 'телефон не указан',
  }
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

const OrderCard = ({
  order,
  locations,
  clientsById,
  hasConflict,
  canManage,
  onArchive,
  onEdit,
}) => {
  const location = locations.find((item) => item._id === order.locationId)
  const orderClient = getOrderClientLabel(order, clientsById)
  const payoutTotal = getOrderPayoutTotal(order)
  const incomeTotal = getOrderTransactionTotal(order, 'income')
  const openTasksCount = (order.additionalEvents ?? []).filter(
    (item) => !item.done
  ).length

  return (
    <PartyCard onClick={() => onEdit?.(order)}>
      <PartyCardHeader>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold truncate">
              {order.title || order.serviceTitle || 'Заказ'}
            </p>
            {hasConflict && (
              <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded shrink-0">
                Конфликт
              </span>
            )}
            {(order.assignedStaff ?? []).length === 0 && (
              <span className="px-2 py-1 text-xs font-semibold rounded shrink-0 bg-amber-100 text-amber-700">
                Без исполнителя
              </span>
            )}
            {openTasksCount > 0 && (
              <span className="px-2 py-1 text-xs font-semibold rounded shrink-0 bg-sky-100 text-sky-700">
                Задачи: {openTasksCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-black/60">
            {formatDateTime(order.eventDate)} ·{' '}
            {order.placeType === 'company_location'
              ? location?.title || 'Точка не выбрана'
              : order.customAddress || 'Выездной адрес не указан'}
          </p>
          <p className="mt-1 text-sm truncate text-black/60">
            Клиент: {orderClient.name} · {orderClient.phone}
          </p>
          <p className="mt-1 text-sm text-black/60">
            Договор: {formatMoney(getOrderContractAmount(order))} · получено:{' '}
            {formatMoney(incomeTotal)} · выплаты: {formatMoney(payoutTotal)}
          </p>
        </div>
        {canManage && (
          <PartyCardActions>
            <CardButton
              icon={faBoxArchive}
              onClick={() => onArchive(order._id)}
              color="red"
              tooltipText="Отменить"
            />
          </PartyCardActions>
        )}
      </PartyCardHeader>
    </PartyCard>
  )
}

export default function OrdersList({
  orders = [],
  filteredOrders = [],
  locations,
  clientsById,
  hasOrderConflict,
  canManage,
  onArchive,
  onEdit,
  orderFilter,
  onFilterChange,
  orderFilters,
  ordersCount,
  onCreateClick,
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Заказы</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-black/55">{ordersCount}</span>
          {canManage && (
            <button
              type="button"
              onClick={onCreateClick}
              className="grid w-10 h-10 text-2xl font-semibold leading-none text-white transition-colors rounded-md place-items-center bg-sky-600 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Создать заказ"
              title="Создать заказ"
            >
              +
            </button>
          )}
        </div>
      </div>

      {orderFilters && (
        <div className="flex flex-wrap gap-2 mt-5">
          {orderFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                orderFilter === filter.value
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-sky-100 bg-white text-slate-700 hover:bg-sky-50'
              }`}
            >
              {filter.label}
              <span
                className={`ml-2 ${
                  orderFilter === filter.value
                    ? 'text-white/80'
                    : 'text-slate-400'
                }`}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 mt-5">
        {orders.length === 0 && (
          <p className="text-sm text-black/55">Заказы еще не добавлены.</p>
        )}
        {orders.length > 0 && filteredOrders.length === 0 && (
          <p className="text-sm text-black/55">
            По выбранному фильтру заказов нет.
          </p>
        )}
        {filteredOrders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            locations={locations}
            clientsById={clientsById}
            hasConflict={hasOrderConflict(order, orders)}
            canManage={canManage}
            onArchive={onArchive}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  )
}
