'use client'

import loadingAtom from '@state/atoms/loadingAtom'
import errorAtom from '@state/atoms/errorAtom'
import PropTypes from 'prop-types'
import CardButtons from '@components/CardButtons'
import LoadingSpinner from '@components/LoadingSpinner'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import { REQUEST_STATUSES } from '@helpers/constants'
import formatDate from '@helpers/formatDate'
import formatAddress from '@helpers/formatAddress'
import { modalsFuncAtom } from '@state/atoms'
import clientSelector from '@state/selectors/clientSelector'
import { useAtomValue } from 'jotai'

const createStatusMap = (statuses) =>
  statuses.reduce((acc, item) => {
    acc[item.value] = item
    return acc
  }, {})

const statusClassNames = {
  new: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  converted: 'bg-green-500',
  canceled: 'bg-red-500',
}

const statusMap = createStatusMap(REQUEST_STATUSES)

const RequestCardCompact = ({ request, style, onEdit, onView, onStatusEdit }) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const loading = useAtomValue(loadingAtom('request' + request._id))
  const error = useAtomValue(errorAtom('request' + request._id))
  const status = statusMap[request.status] ?? statusMap.new
  const statusColor = statusClassNames[status?.value] || 'bg-blue-500'
  const hasEvent = Boolean(request.eventId)
  const calendarLink = request.calendarLink || null
  const client = useAtomValue(clientSelector(request.clientId))
  const contactUser =
    client || (request.clientPhone ? { phone: request.clientPhone } : null)

  const contactChannels =
    request.contactChannels?.length > 0
      ? request.contactChannels.join(', ')
      : null
  const formatTime = (value) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const requestCreatedLabel = request.createdAt
    ? `${formatDate(request.createdAt, false, true)} ${formatTime(
        request.createdAt
      )}`
    : 'Дата заявки не указана'

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
          className="absolute top-2 right-2 z-10 flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold text-white ${statusColor}`}
            onClick={(event) => {
              event.stopPropagation()
              onStatusEdit?.(request._id)
            }}
          >
            {status?.name || 'Новая'}
          </button>
          <CardButtons
            item={request}
            typeOfItem="request"
            minimalActions
            alwaysCompact
            showEditButton={!hasEvent}
            showDeleteButton={!hasEvent}
            onEdit={onEdit}
            calendarLink={calendarLink}
          />
        </div>
        <div className={`absolute top-0 left-0 h-full w-1.5 ${statusColor}`} />

        <div className="flex h-full w-full flex-col gap-0.5 pr-4 pl-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">
              {requestCreatedLabel}
            </div>
          </div>
          <div className="grid gap-0.5 text-sm text-gray-700">
            {/* <div className="font-medium text-gray-800 truncate">
              Дата заявки:{' '}
              {request.createdAt
                ? `${formatDate(request.createdAt, false, true)} ${formatTime(
                    request.createdAt
                  )}`
                : '-'}
            </div> */}
            <div className="truncate font-medium text-gray-800">
              Дата мероприятия:{' '}
              {request.eventDate
                ? `${formatDate(request.eventDate, false, true)} ${formatTime(
                    request.eventDate
                  )}`
                : '-'}
            </div>
            <div className="truncate">
              <div className="truncate font-medium text-gray-800">
                {formatAddress(
                  request.address,
                  request.location || 'Место не указано'
                )}
              </div>
            </div>
          </div>
          <div className="tablet:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid gap-0.5 text-sm text-gray-700">
            <div className="text-sm text-gray-700">
              <span className="font-medium text-gray-800">Клиент:</span>{' '}
              {request.clientName || 'Не указан'}
            </div>
            <div className="truncate">
              {contactChannels && (
                <div className="truncate text-xs text-gray-500">
                  {contactChannels}
                </div>
              )}
            </div>
          </div>
          {contactUser && (
            <ContactsIconsButtons user={contactUser} className="text-sm" />
          )}
          {/* {request.comment && (
            <div className="text-sm text-gray-600">{request.comment}</div>
          )} */}
        </div>
        <button
          type="button"
          className={`absolute right-0 bottom-0 cursor-pointer rounded-tl-lg rounded-br-xl px-3 py-1.5 text-xs font-semibold text-white shadow ${
            hasEvent
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
          onClick={(event) => {
            event.stopPropagation()
            if (hasEvent) {
              modalsFunc.event?.view(request.eventId)
            } else {
              modalsFunc.event?.fromRequest(request._id)
            }
          }}
        >
          {hasEvent ? 'Открыть мероприятие' : 'Создать мероприятие'}
        </button>
        <div className="mt-auto mb-6 self-end text-right text-lg font-semibold whitespace-nowrap text-gray-900">
          {request.contractSum
            ? `${request.contractSum.toLocaleString()} ₽`
            : '-'}
        </div>
      </div>
    </div>
  )
}

RequestCardCompact.propTypes = {
  request: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    clientName: PropTypes.string,
    clientPhone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    contactChannels: PropTypes.arrayOf(PropTypes.string),
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    eventDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    location: PropTypes.string,
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
    contractSum: PropTypes.number,
    status: PropTypes.string,
    comment: PropTypes.string,
  }).isRequired,
  style: PropTypes.shape({}),
  onEdit: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired,
  onStatusEdit: PropTypes.func,
}

RequestCardCompact.defaultProps = {
  style: null,
  onStatusEdit: null,
}

export default RequestCardCompact
