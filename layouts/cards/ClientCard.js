'use client'

import loadingAtom from '@state/atoms/loadingAtom'
import errorAtom from '@state/atoms/errorAtom'
import PropTypes from 'prop-types'
import CardButtons from '@components/CardButtons'
import LoadingSpinner from '@components/LoadingSpinner'
import formatDate from '@helpers/formatDate'
import { useAtomValue } from 'jotai'

const ClientCard = ({ client, style, onEdit, onView }) => {
  const loading = useAtomValue(loadingAtom('client' + client._id))
  const error = useAtomValue(errorAtom('client' + client._id))
  const lastRequestLabel = client.lastRequest
    ? formatDate(client.lastRequest.toISOString(), false, true)
    : '-'

  return (
    <div style={style} className="px-2 py-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && onView?.()}
        className="group relative flex h-full w-full cursor-pointer overflow-visible rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-card"
      >
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-800 bg-opacity-80 text-2xl text-white">
            ОШИБКА
          </div>
        )}
        {loading && !error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-general bg-opacity-80">
            <LoadingSpinner />
          </div>
        )}
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(event) => event.stopPropagation()}
        >
          <CardButtons
            item={client}
            typeOfItem="client"
            minimalActions
            alwaysCompact
            onEdit={onEdit}
          />
        </div>

        <div className="flex h-full w-full gap-3">
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">
                {client.firstName || '-'} {client.secondName || ''}
              </div>
              <div className="text-sm text-gray-500">
                Последняя заявка: {lastRequestLabel}
              </div>
            </div>
            <div className="grid gap-2 text-sm text-gray-700 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="truncate">
                <div className="truncate font-medium text-gray-800">
                  {client.phone ? `+${client.phone}` : 'Телефон не указан'}
                </div>
              </div>
              <div className="truncate">
                <div className="truncate font-medium text-gray-800">
                  {client.priorityContact || 'Контакт не указан'}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto self-end whitespace-nowrap text-right text-sm font-semibold text-gray-700">
            <div>Заявки: {client.requestsCount}</div>
            <div>Мероприятия: {client.eventsCount}</div>
            <div>Отмененные: {client.canceledEventsCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

ClientCard.propTypes = {
  client: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    firstName: PropTypes.string,
    secondName: PropTypes.string,
    phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    priorityContact: PropTypes.string,
    requestsCount: PropTypes.number,
    eventsCount: PropTypes.number,
    canceledEventsCount: PropTypes.number,
    lastRequest: PropTypes.instanceOf(Date),
  }).isRequired,
  style: PropTypes.shape({}),
  onEdit: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired,
}

ClientCard.defaultProps = {
  style: null,
}

export default ClientCard
