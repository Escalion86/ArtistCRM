'use client'

import loadingAtom from '@state/atoms/loadingAtom'
import errorAtom from '@state/atoms/errorAtom'
import PropTypes from 'prop-types'
import CardButtons from '@components/CardButtons'
import CardOverlay from '@components/CardOverlay'
import CardActions from '@components/CardActions'
import formatDate from '@helpers/formatDate'
import { useAtomValue } from 'jotai'
import CardWrapper from '@components/CardWrapper'

const ClientCard = ({ client, style, onEdit, onView }) => {
  const loading = useAtomValue(loadingAtom('client' + client._id))
  const error = useAtomValue(errorAtom('client' + client._id))
  const lastRequestLabel = client.lastRequest
    ? formatDate(client.lastRequest.toISOString(), false, true)
    : '-'

  return (
    <CardWrapper
      style={style}
      onClick={() => !loading && onView?.()}
      className="group flex h-full w-full cursor-pointer overflow-visible p-4 text-left hover:border-gray-300"
    >
      <CardOverlay loading={loading} error={error} />
      <CardActions>
        <CardButtons
          item={client}
          typeOfItem="client"
          minimalActions
          alwaysCompact
          onEdit={onEdit}
        />
      </CardActions>

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
          <div className="grid gap-2 text-sm text-gray-700">
            <div className="truncate font-medium text-gray-800">
              {client.phone ? `+${client.phone}` : 'Телефон не указан'}
            </div>
          </div>
        </div>
        <div className="mt-auto self-end whitespace-nowrap text-right text-sm font-semibold text-gray-700">
          <div>Заявки: {client.requestsCount}</div>
          <div>Мероприятия: {client.eventsCount}</div>
          <div>Отмененные: {client.canceledEventsCount}</div>
        </div>
      </div>
    </CardWrapper>
  )
}

ClientCard.propTypes = {
  client: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    firstName: PropTypes.string,
    secondName: PropTypes.string,
    phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
