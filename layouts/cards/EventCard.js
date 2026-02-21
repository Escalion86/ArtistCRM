'use client'

// import cn from 'classnames'
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import Image from 'next/image'
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
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShare,
  faTriangleExclamation,
  faCircleCheck,
  faBan,
  faUserSlash,
  faCalendarXmark,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import CardOverlay from '@components/CardOverlay'
import CardActions from '@components/CardActions'
import CardWrapper from '@components/CardWrapper'
import { getSoonNoDepositEvents } from '@helpers/additionalEvents'
import getGoogleCalendarLinkFromText from '@helpers/getGoogleCalendarLinkFromText'
import getPersonFullName from '@helpers/getPersonFullName'

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
  const siteSettings = useAtomValue(siteSettingsAtom)

  const calendarLink = useMemo(() => {
    return getGoogleCalendarLinkFromText(event?.description)
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
  const hasCalendarError = Boolean(event?.calendarSyncError)
  const isCanceled = rawStatus === 'canceled'
  const isClosed = rawStatus === 'closed'
  const isDraft = rawStatus === 'draft'
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
  const displayAddress = useMemo(() => {
    const address = event?.address
    if (!address) return address
    const defaultTown = siteSettings?.defaultTown
    if (!defaultTown || !address?.town) return address
    const normalizedTown = String(address.town).trim().toLowerCase()
    const normalizedDefaultTown = String(defaultTown).trim().toLowerCase()
    if (normalizedTown !== normalizedDefaultTown) return address
    return { ...address, town: '' }
  }, [event?.address, siteSettings?.defaultTown])

  const hasSoonNoDepositWarning = useMemo(() => {
    if (!event?._id) return false
    const items = getSoonNoDepositEvents([event], transactions, new Date(), 3)
    return items.length > 0
  }, [event, transactions])

  const nearestAdditionalEventInfo = useMemo(() => {
    const additionalEvents = Array.isArray(event?.additionalEvents)
      ? event.additionalEvents
      : []
    if (additionalEvents.length === 0) return null

    const nowDate = new Date()
    const prepared = additionalEvents
      .map((item) => {
        if (item?.done) return null
        const date = item?.date ? new Date(item.date) : null
        if (!date || Number.isNaN(date.getTime())) return null
        return {
          title: item?.title || 'Доп. событие',
          date,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    if (prepared.length === 0) return null

    const overdueItems = prepared.filter(
      (item) => item.date.getTime() < nowDate.getTime()
    )
    if (overdueItems.length > 0) {
      const overdue = overdueItems[overdueItems.length - 1]
      const timeLabel = overdue.date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return {
        title: overdue.title,
        label: `${formatDate(overdue.date)} ${timeLabel}`,
        isToday: false,
        isTomorrow: false,
        isLater: false,
        isOverdue: true,
        totalCount: prepared.length,
        remainingCount: prepared.length - 1,
      }
    }

    const nearest = prepared.find(
      (item) => item.date.getTime() >= nowDate.getTime()
    )
    if (!nearest) return null

    const isToday =
      nearest.date.getFullYear() === nowDate.getFullYear() &&
      nearest.date.getMonth() === nowDate.getMonth() &&
      nearest.date.getDate() === nowDate.getDate()

    const tomorrow = new Date(nowDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow =
      nearest.date.getFullYear() === tomorrow.getFullYear() &&
      nearest.date.getMonth() === tomorrow.getMonth() &&
      nearest.date.getDate() === tomorrow.getDate()

    const timeLabel = nearest.date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const prefix = isToday
      ? 'Сегодня'
      : isTomorrow
        ? 'Завтра'
        : formatDate(nearest.date)
    return {
      title: nearest.title,
      label: `${prefix} ${timeLabel}`,
      isToday,
      isTomorrow,
      isLater: !isToday && !isTomorrow,
      isOverdue: false,
      totalCount: prepared.length,
      remainingCount: prepared.length - 1,
    }
  }, [event?.additionalEvents])

  const hiddenAdditionalCount = hasSoonNoDepositWarning
    ? (nearestAdditionalEventInfo?.totalCount ?? 0)
    : (nearestAdditionalEventInfo?.remainingCount ?? 0)

  const hiddenAdditionalCountClass = hasSoonNoDepositWarning
    ? nearestAdditionalEventInfo?.isOverdue
      ? 'border-red-300 bg-red-50 text-red-700'
      : nearestAdditionalEventInfo?.isToday
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : nearestAdditionalEventInfo?.isTomorrow
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-gray-300 bg-gray-50 text-gray-700'
    : 'border-gray-300 bg-gray-50 text-gray-700'

  if (!event) return null

  return (
    <CardWrapper
      style={style}
      outerClassName="px-2 py-1"
      onClick={() => !loading && modalsFunc.event?.view(event._id)}
      className="laptop:flex-row laptop:items-start laptop:gap-4 flex h-[160px] cursor-pointer flex-col gap-x-3 gap-y-1 overflow-hidden rounded-lg p-3"
    >
      <CardOverlay loading={loading} error={error} />
      <div className="flex items-center justify-between w-full gap-x-1">
        <div className="flex items-center flex-1 min-w-0 gap-2">
          {event.isTransferred && (
            <FontAwesomeIcon
              icon={faShare}
              className="w-4 h-4 text-amber-500"
              title="Передано коллеге"
            />
          )}
          {needsCheck && (
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="w-4 h-4 text-amber-500"
              title="Проверка мероприятия не завершена"
            />
          )}
          {hasCalendarError && (
            <FontAwesomeIcon
              icon={faCalendarXmark}
              className="w-4 h-4 text-red-500"
              title="Синхронизация с календарем не выполнена"
            />
          )}
          {isClosed && (
            <FontAwesomeIcon
              icon={faCircleCheck}
              className="w-4 h-4 text-green-600"
              title="Мероприятие закрыто"
            />
          )}
          {isCanceled && (
            <FontAwesomeIcon
              icon={faBan}
              className="w-4 h-4 text-red-500"
              title="Мероприятие отменено"
            />
          )}
          {isFinished && (
            <FontAwesomeIcon
              icon={faCircleCheck}
              className="w-4 h-4 text-gray-400"
              title="Мероприятие завершено"
            />
          )}
          {isDraft && (
            <FontAwesomeIcon
              icon={faClock}
              className="w-4 h-4 text-blue-500"
              title="Заявка"
            />
          )}
          <div className="flex-1 text-lg font-semibold text-gray-900 truncate">
            {servicesTitle}
          </div>
          <CardActions className="z-10 -mt-1 -mr-3">
            <CardButtons
              item={event}
              typeOfItem="event"
              minimalActions
              alwaysCompact
              calendarLink={calendarLink}
              onEdit={() => modalsFunc.event?.edit(event._id)}
              showEditButton={!isClosed}
            />
          </CardActions>
        </div>
        <div className="flex items-center gap-2">
          {!client && (
            <FontAwesomeIcon
              icon={faUserSlash}
              className="w-4 h-4 text-red-500"
              title="Клиент не указан"
            />
          )}
        </div>
      </div>
      <div className="flex gap-x-1 py-0.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2 text-sm text-gray-700">
          <div className="font-semibold text-gray-800 text-general">
            {eventDateLabel}
          </div>
          <div className="flex items-center h-6 gap-1 overflow-hidden">
            {hasSoonNoDepositWarning ? (
              <div className="inline-flex max-w-full min-w-0 items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                <span className="truncate">Просрочен задаток</span>
              </div>
            ) : nearestAdditionalEventInfo ? (
              <div
                className={
                  nearestAdditionalEventInfo.isOverdue
                    ? 'inline-flex max-w-full min-w-0 items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'
                    : nearestAdditionalEventInfo.isToday
                      ? 'inline-flex max-w-full min-w-0 items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700'
                      : nearestAdditionalEventInfo.isTomorrow
                        ? 'inline-flex max-w-full min-w-0 items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'
                        : 'inline-flex max-w-full min-w-0 items-center rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700'
                }
              >
                <span className="truncate">{`${nearestAdditionalEventInfo.title}: ${nearestAdditionalEventInfo.label}`}</span>
              </div>
            ) : null}
            {hiddenAdditionalCount > 0 ? (
              <div
                className={`inline-flex max-w-max shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${hiddenAdditionalCountClass}`}
              >
                +{hiddenAdditionalCount}
              </div>
            ) : null}
          </div>
          <div className="flex h-[25px] flex-nowrap items-center gap-x-3">
            <span className="font-medium">Место:</span>
            <span className="flex items-center min-w-0 gap-2 truncate">
              <span className="truncate">
                {formatAddress(displayAddress, '-')}
              </span>
              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть в 2ГИС"
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center justify-center transition-transform h-7 w-7 hover:scale-110"
                >
                  <Image
                    src="/img/navigators/2gis.png"
                    alt="2gis"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                </a>
              )}
            </span>
          </div>
          <div className="flex h-[25px] flex-nowrap items-center gap-x-3">
            <span className="font-medium">Клиент:</span>
            <span className="truncate">
              {client
                ? getPersonFullName(client, { fallback: client._id })
                : '-'}
            </span>
            {client && <ContactsIconsButtons user={client} />}
          </div>
        </div>

        {isClosed ? (
          <div className="event-profit-card tablet:min-w-[120px] absolute right-0 bottom-0 flex min-w-[80px] items-center justify-end rounded-tl-xl px-3 py-2 text-sm font-semibold">
            <span className="event-profit-text">{net.toLocaleString()}</span>
          </div>
        ) : (
          <div className="laptop:min-w-[240px] laptop:self-start flex shrink-0 items-end">
            <div className="flex items-end justify-end gap-3 text-sm font-semibold">
              {paid > 0 && contractSum > 0 && paid >= contractSum ? (
                <span className="text-green-700">{paid.toLocaleString()}</span>
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
    </CardWrapper>
  )
}

export default EventCard
