'use client'

import PropTypes from 'prop-types'
import CardButtons from '@components/CardButtons'
import { TRANSACTION_CATEGORIES } from '@helpers/constants'
import formatDate from '@helpers/formatDate'
import formatAddress from '@helpers/formatAddress'

const typeClassNames = {
  income: 'bg-green-500',
  expense: 'bg-red-500',
}

const formatTransactionDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  const datePart = formatDate(date.toISOString(), false, true)
  const timePart = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart} ${timePart}`
}

const TransactionCard = ({
  transaction,
  client,
  event,
  type,
  style,
  onEdit,
  onDelete,
}) => {
  const clientName = client
    ? `${client.firstName || ''} ${client.secondName || ''}`.trim()
    : '-'

  const eventTitle =
    formatAddress(event?.address, '') ||
    (event?.eventDate
      ? `Мероприятие ${formatDate(event.eventDate, false, true)}`
      : 'Мероприятие')

  const eventDateTime = event?.eventDate
    ? `${formatDate(event.eventDate, false, true)} ${new Date(
        event.eventDate
      ).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : null

  const eventTitleWithDate = eventDateTime
    ? `${eventTitle} - ${eventDateTime}`
    : eventTitle

  const categoryLabel =
    TRANSACTION_CATEGORIES.find(
      (item) => item.value === transaction.category
    )?.name ?? null

  return (
    <div style={style} className="px-2 py-2">
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        className="relative flex w-full h-full p-3 pr-4 overflow-visible text-left transition bg-white border border-gray-200 shadow-sm cursor-pointer group rounded-xl hover:border-gray-300 hover:shadow"
      >
        <div
          className="absolute z-10 right-2 top-2"
          onClick={(event) => event.stopPropagation()}
        >
          <CardButtons
            item={transaction}
            typeOfItem="transaction"
            minimalActions
            alwaysCompact
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <div
          className={`absolute left-0 top-0 h-full w-1.5 ${
            typeClassNames[type?.value ?? transaction.type] || 'bg-gray-300'
          }`}
        />

        <div className="flex flex-col w-full h-full pl-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">
              {formatTransactionDate(transaction.date)}
            </div>
            {categoryLabel && (
              <div className="text-xs font-medium text-gray-500">
                {categoryLabel}
              </div>
            )}
          </div>
          <div className="grid text-sm text-gray-700 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="truncate">
              <div className="font-medium text-gray-800 truncate">
                {clientName || '-'}
              </div>
            </div>
            <div className="truncate">
              <div className="font-medium text-gray-800 truncate">
                {eventTitleWithDate}
              </div>
            </div>
          </div>
          {transaction.comment && (
            <div className="text-sm text-gray-600">
              {transaction.comment}
            </div>
          )}
        </div>
        <div className="self-end mt-auto text-lg font-semibold text-right text-gray-900 whitespace-nowrap">
          {transaction.amount
            ? `${transaction.amount.toLocaleString()} ₽`
            : '0 ₽'}
        </div>
      </div>
    </div>
  )
}

TransactionCard.propTypes = {
  transaction: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    date: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    type: PropTypes.string,
    clientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    comment: PropTypes.string,
    amount: PropTypes.number,
    category: PropTypes.string,
  }).isRequired,
  client: PropTypes.shape({
    firstName: PropTypes.string,
    secondName: PropTypes.string,
  }),
  event: PropTypes.shape({
    eventDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    address: PropTypes.shape({
      town: PropTypes.string,
      street: PropTypes.string,
      house: PropTypes.string,
      entrance: PropTypes.string,
      floor: PropTypes.string,
      flat: PropTypes.string,
      comment: PropTypes.string,
      link2Gis: PropTypes.string,
      linkYandexNavigator: PropTypes.string,
      link2GisShow: PropTypes.bool,
      linkYandexShow: PropTypes.bool,
    }),
  }),
  type: PropTypes.shape({
    value: PropTypes.string,
  }),
  style: PropTypes.shape({}),
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

TransactionCard.defaultProps = {
  client: null,
  event: null,
  type: null,
  style: null,
}

export default TransactionCard
