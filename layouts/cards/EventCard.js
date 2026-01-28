'use client'

// import cn from 'classnames'
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { EVENT_STATUSES, EVENT_STATUSES_SIMPLE } from '@helpers/constants'
import formatDate from '@helpers/formatDate'
import formatAddress from '@helpers/formatAddress'
import { modalsFuncAtom } from '@state/atoms'
import transactionsAtom from '@state/atoms/transactionsAtom'
import eventSelector from '@state/selectors/eventSelector'
import clientSelector from '@state/selectors/clientSelector'
import servicesAtom from '@state/atoms/servicesAtom'
import loadingAtom from '@state/atoms/loadingAtom'
import errorAtom from '@state/atoms/errorAtom'
import LoadingSpinner from '@components/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShare,
  faTriangleExclamation,
  faCircleCheck,
  faBan,
  faUserSlash,
} from '@fortawesome/free-solid-svg-icons'
import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'

const CALENDAR_RESPONSE_MARKER = '--- Google Calendar Response ---'

// const stripCalendarResponse = (text = '') => {
//   const marker = `\n\n${CALENDAR_RESPONSE_MARKER}\n`
//   const markerIndex = text.indexOf(marker)
//   if (markerIndex === -1) return text.trim()
//   return text.slice(0, markerIndex).trim()
// }

const EventCard = ({ eventId, style }) => {
  const event = useAtomValue(eventSelector(eventId))
  const client = useAtomValue(clientSelector(event?.clientId))
  const transactions = useAtomValue(transactionsAtom)
  const services = useAtomValue(servicesAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const loading = useAtomValue(loadingAtom('event' + eventId))
  const error = useAtomValue(errorAtom('event' + eventId))

  const calendarLink = useMemo(() => {
    if (!event?.description) return null
    const match = event.description.match(
      /https?:\/\/(?:www\.)?google\.com\/calendar\/event\?eid=\S+|https?:\/\/calendar\.google\.com\/calendar\/\S+/i
    )
    if (!match?.[0]) return null
    return match[0].replace(/[),.]+$/, '')
  }, [event?.description])

  const servicesTitle = useMemo(() => {
    const servicesIds = event?.servicesIds ?? []
    if (!servicesIds.length) return 'Услуга не указана'
    const titles = services
      .filter((service) => servicesIds.includes(service._id))
      .map((service) => service.title)
      .filter(Boolean)
    return titles.length > 0 ? titles.join(', ') : 'Услуга не указана'
  }, [event?.servicesIds, services])

  const { contractSum, paid, leftToPay, status, expense, net, canClose } =
    useMemo(() => {
      if (!event)
        return {
          contractSum: 0,
          paid: 0,
          leftToPay: 0,
          expense: 0,
          net: 0,
          status: null,
          canClose: false,
        }

      const eventTransactions = transactions
        .filter((transaction) => transaction.eventId === event._id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const totals = eventTransactions.reduce(
        (acc, transaction) => {
          if (transaction.type === 'income') acc.income += transaction.amount
          else acc.expense += transaction.amount
          return acc
        },
        { income: 0, expense: 0 }
      )

      const contractSumValue = Number(event.contractSum ?? 0)
      const paidValue = totals.income
      const leftToPayValue = Math.max(contractSumValue - paidValue, 0)
      const statusValue =
        EVENT_STATUSES_SIMPLE.find((item) => item.value === event.status) ??
        EVENT_STATUSES.find((item) => item.value === event.status)
      const hasTaxes = eventTransactions.some(
        (transaction) => transaction.category === 'taxes'
      )
      const canCloseValue =
        contractSumValue <= paidValue && (!event?.isByContract || hasTaxes)

      return {
        contractSum: contractSumValue,
        paid: paidValue,
        leftToPay: leftToPayValue,
        expense: totals.expense,
        net: totals.income - totals.expense,
        status: statusValue,
        canClose: canCloseValue,
      }
    }, [event, transactions])

  const eventStart = event.eventDate ? new Date(event.eventDate) : null
  const eventEnd = event.dateEnd ? new Date(event.dateEnd) : eventStart
  const now = new Date()
  const eventDateLabel = event.eventDate
    ? `${formatDate(event.eventDate, false, true)} ${new Date(
        event.eventDate
      ).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : '-'

  const rawStatus = status?.value ?? event.status
  const needsCheck = event?.calendarImportChecked === false
  const isCanceled = rawStatus === 'canceled'
  const isClosed = rawStatus === 'closed'
  const isFinished =
    !isCanceled && !isClosed && eventEnd && eventEnd.getTime() < now.getTime()

  const coordsLink =
    event?.address?.latitude && event?.address?.longitude
      ? `dgis://2gis.ru/geo/${event.address.longitude},${event.address.latitude}`
      : null
  const searchAddress =
    event?.address?.town && event?.address?.street && event?.address?.house
      ? `${event.address.town}, ${event.address.street}, ${event.address.house}`
      : null
  const searchLink = searchAddress
    ? `https://2gis.ru/search/${encodeURIComponent(searchAddress).replaceAll(
        '%20',
        ''
      )}`
    : null
  const mapLink = event?.address?.link2Gis || coordsLink || searchLink

  if (!event) return null

  return (
    <div style={style} className="px-2 py-1">
      <div
        className="laptop:flex-row laptop:items-start laptop:gap-4 hover:shadow-card relative flex h-[160px] cursor-pointer flex-col gap-x-3 gap-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition"
        onClick={() => !loading && modalsFunc.event?.view(event._id)}
      >
        {error && (
          <div className="bg-opacity-80 absolute inset-0 z-20 flex items-center justify-center bg-red-800 text-2xl text-white">
            ОШИБКА
          </div>
        )}
        {loading && !error && (
          <div className="bg-general bg-opacity-80 absolute inset-0 z-20 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        <div className="flex w-full items-center justify-between gap-x-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {event.isTransferred && (
              <FontAwesomeIcon
                icon={faShare}
                className="h-4 w-4 text-amber-500"
                title="Передано коллеге"
              />
            )}
            {needsCheck && (
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="h-4 w-4 text-amber-500"
                title="Проверка мероприятия не завершена"
              />
            )}
            {isClosed && (
              <FontAwesomeIcon
                icon={faCircleCheck}
                className="h-4 w-4 text-green-600"
                title="Мероприятие закрыто"
              />
            )}
            {isCanceled && (
              <FontAwesomeIcon
                icon={faBan}
                className="h-4 w-4 text-red-500"
                title="Мероприятие отменено"
              />
            )}
            {isFinished && (
              <FontAwesomeIcon
                icon={faCircleCheck}
                className="h-4 w-4 text-gray-400"
                title="Мероприятие завершено"
              />
            )}
            <div className="flex-1 truncate text-lg font-semibold text-gray-900">
              {servicesTitle}
            </div>
            <div
              className="z-10 -mt-1 -mr-3"
              onClick={(event) => event.stopPropagation()}
            >
              <CardButtons
                item={event}
                typeOfItem="event"
                minimalActions
                alwaysCompact
                calendarLink={calendarLink}
                onEdit={() => modalsFunc.event?.edit(event._id)}
                showEditButton={!isClosed}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!client && (
              <FontAwesomeIcon
                icon={faUserSlash}
                className="h-4 w-4 text-red-500"
                title="Клиент не указан"
              />
            )}
          </div>
        </div>
        <div className="flex gap-x-1">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2 text-sm text-gray-700">
            <div className="text-general font-semibold text-gray-800">
              {eventDateLabel}
            </div>
            <div className="flex flex-nowrap items-center gap-x-3">
              <span className="font-medium">Место:</span>
              <span className="flex min-w-0 items-center gap-2 truncate">
                <span className="truncate">
                  {formatAddress(event.address, '-')}
                </span>
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Открыть в 2ГИС"
                    onClick={(event) => event.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center transition-transform hover:scale-110"
                  >
                    <img
                      src="/img/navigators/2gis.png"
                      alt="2gis"
                      className="h-4 w-4"
                    />
                  </a>
                )}
              </span>
            </div>
            <div className="flex flex-nowrap items-center gap-x-3">
              <span className="font-medium">Клиент:</span>
              <span className="truncate">
                {client
                  ? `${client.firstName ?? ''} ${
                      client.secondName ?? ''
                    }`.trim() || client._id
                  : '-'}
              </span>
            </div>
            {client && <ContactsIconsButtons user={client} />}
          </div>

          {isClosed ? (
            <div className="event-profit-card absolute -bottom-3 -right-3 flex min-w-[160px] items-center justify-end rounded-tl-xl px-3 py-2 text-sm font-semibold">
              <span className="event-profit-text">{net.toLocaleString()}</span>
            </div>
          ) : (
            <div className="laptop:min-w-[240px] laptop:self-start flex shrink-0 items-end">
              <div className="flex items-end justify-end gap-3 text-sm font-semibold">
                {leftToPay === 0 && canClose && paid > 0 ? (
                  <span className="text-green-700">
                    {paid.toLocaleString()}
                  </span>
                ) : (
                  <span>
                    {paid > 0 ? (
                      <span className="text-green-700">
                        {paid.toLocaleString()}
                      </span>
                    ) : null}
                    {paid > 0 && contractSum > 0 ? ' / ' : null}
                    {contractSum > 0 ? (
                      <span className="text-blue-700">
                        {contractSum.toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventCard
