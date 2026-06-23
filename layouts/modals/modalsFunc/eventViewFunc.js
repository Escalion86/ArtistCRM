import CardButtons from '@components/CardButtons'
import Chip from '@components/Chips/Chip'
import cn from 'classnames'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import ImageGallery from '@components/ImageGallery'
import SurfaceCard from '@components/SurfaceCard'
import TextLine from '@components/TextLine'
import formatAddress from '@helpers/formatAddress'
import formatDateTime from '@helpers/formatDateTime'
import formatMinutes from '@helpers/formatMinutes'
import getGoogleCalendarLinkFromText from '@helpers/getGoogleCalendarLinkFromText'
import getEventDuration from '@helpers/getEventDuration'
import getPersonFullName from '@helpers/getPersonFullName'
import Image from 'next/image'
import sanitizeHtml from '@helpers/sanitizeHtml'
import { getAdditionalEventsDisplayGroups } from '@helpers/additionalEvents'
import { useEffect, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import servicesAtom from '@state/atoms/servicesAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import { modalsFuncAtom } from '@state/atoms'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { useClientsQuery } from '@helpers/useClientsQuery'
import { useEventQuery } from '@helpers/useEventsQuery'
import {
  getCloseBlockedByObligationsMessage,
  hasObligationPaymentMethod,
} from '@helpers/transactionObligation'
import AdditionalEventCard from './AdditionalEventCard'
import openEventAdditionalEventEditorModal from './eventAdditionalEventEditorModal'
import openEventAdditionalEventViewModal from './eventAdditionalEventViewModal'

const EVENT_STATUS_META = Object.freeze({
  draft: {
    label: 'Заявка',
    className: 'event-view-status event-view-status--draft',
  },
  active: {
    label: 'Мероприятие',
    className: 'event-view-status event-view-status--active',
  },
  canceled: {
    label: 'Отменено',
    className: 'event-view-status event-view-status--canceled',
  },
  finished: {
    label: 'Завершено',
    className: 'event-view-status event-view-status--finished',
  },
  closed: {
    label: 'Закрыто',
    className: 'event-view-status event-view-status--closed',
  },
})

const formatClientContactLines = (client) => {
  if (!client || typeof client !== 'object') return []
  const lines = []
  if (client?.phone) lines.push(`Телефон: ${client.phone}`)
  if (client?.whatsapp) lines.push(`WhatsApp: ${client.whatsapp}`)
  if (client?.viber) lines.push(`Viber: ${client.viber}`)
  if (client?.telegram) lines.push(`Telegram: ${client.telegram}`)
  if (client?.instagram) lines.push(`Instagram: ${client.instagram}`)
  if (client?.vk) lines.push(`VK: ${client.vk}`)
  if (client?.email) lines.push(`Email: ${client.email}`)
  return lines
}

const SectionBlock = ({ title, children }) => (
  <SurfaceCard>
    {title ? (
      <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </div>
    ) : null}
    {children}
  </SurfaceCard>
)

const CardButtonsComponent = ({ event, calendarLink }) => (
  <CardButtons
    item={event}
    typeOfItem="event"
    minimalActions
    alwaysCompact
    calendarLink={calendarLink}
    dropDownPlacement="left"
    showEditButton={event?.status !== 'closed'}
  />
)

const eventViewFunc = (eventId) => {
  const EventViewModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
    setTopLeftComponent,
  }) => {
    const { data: event } = useEventQuery(eventId)
    const services = useAtomValue(servicesAtom)
    const transactions = useAtomValue(transactionsAtom)
    const { data: clients = [] } = useClientsQuery()
    const siteSettings = useAtomValue(siteSettingsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const itemsFunc = useAtomValue(itemsFuncAtom)

    const duration = getEventDuration(event)
    const additionalEvents = useMemo(
      () =>
        Array.isArray(event?.additionalEvents) ? event.additionalEvents : [],
      [event?.additionalEvents]
    )
    const additionalEventGroups = useMemo(
      () => getAdditionalEventsDisplayGroups(additionalEvents),
      [additionalEvents]
    )
    const statusMeta =
      EVENT_STATUS_META[event?.status] || EVENT_STATUS_META.active

    const calendarLink = useMemo(() => {
      return getGoogleCalendarLinkFromText(event?.description)
    }, [event?.description])
    const serviceTitles = (event?.servicesIds ?? [])
      .map((serviceId) => services.find((item) => item._id === serviceId))
      .filter(Boolean)
      .map((service) => service.title)
    const mainClient = useMemo(
      () => clients.find((item) => item._id === event?.clientId) ?? null,
      [clients, event?.clientId]
    )
    const otherContacts = useMemo(() => {
      const contacts = Array.isArray(event?.otherContacts)
        ? event.otherContacts
        : []
      return contacts
        .map((contact) => {
          if (!contact?.clientId && !contact?.comment) return null
          const client = clients.find((item) => item._id === contact?.clientId)
          const name = getPersonFullName(client)
          return {
            client,
            label: name || contact?.clientId || 'Контакт',
            comment: contact?.comment ? String(contact.comment) : '',
          }
        })
        .filter(Boolean)
    }, [clients, event?.otherContacts])
    const tagItems = useMemo(() => {
      const list = Array.isArray(event?.tags) ? event.tags : []
      const eventsTags = siteSettings?.eventsTags ?? []
      const map = new Map(
        eventsTags
          .filter((item) => item?.text)
          .map((item) => [String(item.text).toLowerCase(), item.color])
      )
      return list
        .map((value) => String(value).trim())
        .filter(Boolean)
        .map((value) => ({
          value,
          color: map.get(value.toLowerCase()) || '#f3f4f6',
        }))
    }, [event?.tags, siteSettings?.eventsTags])
    const eventTransactions = useMemo(
      () =>
        (transactions ?? []).filter(
          (transaction) => transaction.eventId === event?._id
        ),
      [event?._id, transactions]
    )
    const hasObligations = useMemo(
      () => hasObligationPaymentMethod(eventTransactions),
      [eventTransactions]
    )

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

    const updateAdditionalEvents = async (nextItems) => {
      if (!event?._id) return
      await itemsFunc?.event?.set(
        {
          _id: event._id,
          additionalEvents: nextItems,
        },
        false,
        true
      )
    }

    const editAdditionalEvent = (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const sourceItem = sourceItems[index]
      if (!sourceItem) return
      openEventAdditionalEventEditorModal({
        modalsFunc,
        index,
        sourceItem,
        onConfirm: async (nextItem) => {
          const currentItems = Array.isArray(event?.additionalEvents)
            ? event.additionalEvents
            : []
          const nextItems = currentItems.map((item, idx) =>
            idx === index ? { ...item, ...nextItem } : item
          )
          await updateAdditionalEvents(nextItems)
        },
      })
    }

    const toggleAdditionalEventDone = async (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const target = sourceItems[index]
      if (!target) return
      const nextItems = sourceItems.map((item, idx) =>
        idx === index
          ? {
              ...item,
              done: !Boolean(item?.done),
              doneAt: !Boolean(item?.done) ? new Date().toISOString() : null,
            }
          : item
      )
      await updateAdditionalEvents(nextItems)
    }

    const deleteAdditionalEvent = async (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      if (!sourceItems[index]) return
      const nextItems = sourceItems.filter((_, idx) => idx !== index)
      await updateAdditionalEvents(nextItems)
    }

    const confirmDeleteAdditionalEvent = (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      if (!sourceItems[index]) return
      modalsFunc.confirm({
        title: 'Удаление доп. события',
        text: 'Удалить это доп. событие?',
        onConfirm: async () => {
          await deleteAdditionalEvent(index)
        },
      })
    }

    const openAdditionalEventView = (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const sourceItem = sourceItems[index]
      if (!sourceItem) return
      openEventAdditionalEventViewModal({
        modalsFunc,
        event,
        item: sourceItem,
        index,
        onToggleDone: toggleAdditionalEventDone,
        onEdit: editAdditionalEvent,
        onDelete: deleteAdditionalEvent,
      })
    }

    const openClientView = (client) => {
      if (!client?._id) return
      modalsFunc.client?.view(client._id)
    }

    const getClientCardProps = (client) => {
      if (!client?._id) return {}
      return {
        role: 'button',
        tabIndex: 0,
        onClick: () => openClientView(client),
        onKeyDown: (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          openClientView(client)
        },
      }
    }

    useEffect(() => {
      if (setTopLeftComponent) {
        setTopLeftComponent(() => (
          <CardButtonsComponent event={event} calendarLink={calendarLink} />
        ))
      }
    }, [event, calendarLink, setTopLeftComponent])

    if (!event || !eventId)
      return (
        <div className="flex w-full justify-center text-lg">
          ОШИБКА! Мероприятие не найдено!
        </div>
      )

    return (
      <div className="flex flex-col gap-y-3">
        <ImageGallery images={event?.images} />
        <div className="flex flex-1 flex-col">
          <div className="flex w-full max-w-full flex-1 flex-col gap-y-3 px-2 py-2">
            <div className="flex w-full items-center gap-x-1">
              {tagItems.length > 0 && (
                <div className={cn('flex flex-wrap gap-2', 'flex-1')}>
                  {tagItems.map((tag) => (
                    <Chip key={tag.value} text={tag.value} color={tag.color} />
                  ))}
                </div>
              )}
              {!setTopLeftComponent && (
                <div className="flex flex-1 justify-end">
                  <CardButtonsComponent
                    event={event}
                    calendarLink={calendarLink}
                  />
                </div>
              )}
            </div>
            <SectionBlock>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="tablet:text-2xl text-left text-lg font-bold break-words text-gray-900">
                    {formatAddress(displayAddress, 'Мероприятие')}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Создано:{' '}
                    {formatDateTime(
                      event?.requestCreatedAt ?? event?.createdAt
                    )}
                  </div>
                </div>
                <div
                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </div>
              </div>
              <div className="tablet:grid-cols-3 mt-3 grid grid-cols-1 gap-2 text-sm">
                <div className="event-view-kpi rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="text-[11px] text-gray-500">Начало</div>
                  <div className="font-semibold text-gray-900">
                    {formatDateTime(event?.eventDate)}
                  </div>
                </div>
                <div className="event-view-kpi rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="text-[11px] text-gray-500">Завершение</div>
                  <div className="font-semibold text-gray-900">
                    {formatDateTime(event?.dateEnd)}
                  </div>
                </div>
                <div className="event-view-kpi rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="text-[11px] text-gray-500">Длительность</div>
                  <div className="font-semibold text-gray-900">
                    {formatMinutes(duration ?? 60)}
                  </div>
                </div>
              </div>
            </SectionBlock>

            {event?.description ? (
              <SectionBlock title="Описание">
                <div
                  className="textarea ql w-full max-w-full list-disc overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(event?.description),
                  }}
                />
              </SectionBlock>
            ) : null}

            {hasObligations ? (
              <SectionBlock title="Предупреждение">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {getCloseBlockedByObligationsMessage()}
                </div>
              </SectionBlock>
            ) : null}

            <SectionBlock title="Подробности">
              <TextLine label="ID">{event?._id}</TextLine>
              {event?.address && (
                <TextLine label="Адрес">
                  {formatAddress(displayAddress, '[не указан]')}
                </TextLine>
              )}
              {serviceTitles.length > 0 && (
                <TextLine label="Услуги">{serviceTitles.join(', ')}</TextLine>
              )}
            </SectionBlock>

            {(mainClient || otherContacts.length > 0) && (
              <SectionBlock title="Контакты">
                {mainClient ? (
                  <div
                    {...getClientCardProps(mainClient)}
                    className="event-view-kpi hover:border-general focus:ring-general/30 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-2 transition hover:bg-white hover:shadow-sm focus:ring-2 focus:outline-none"
                  >
                    <div className="text-sm font-semibold text-gray-800">
                      Клиент:{' '}
                      {getPersonFullName(mainClient, {
                        fallback: 'Не указан',
                      })}
                    </div>
                    {formatClientContactLines(mainClient).map((line) => (
                      <div key={line} className="text-xs text-gray-600">
                        {line}
                      </div>
                    ))}
                    <div
                      className="mt-1"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <ContactsIconsButtons user={mainClient} showChat />
                    </div>
                  </div>
                ) : (
                  <TextLine label="Клиент">Не указан</TextLine>
                )}
                {otherContacts.length > 0 && (
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Доп. контакты
                    </div>
                    <div className="flex flex-col gap-2">
                      {otherContacts.map((contact, index) => (
                        <div
                          key={`${contact.label}-${index}`}
                          {...getClientCardProps(contact.client)}
                          className={cn(
                            'event-view-kpi focus:ring-general/30 rounded-lg border border-gray-200 bg-gray-50 p-2 transition focus:ring-2 focus:outline-none',
                            contact.client
                              ? 'hover:border-general cursor-pointer hover:bg-white hover:shadow-sm'
                              : ''
                          )}
                        >
                          <div className="text-sm font-semibold text-gray-800">
                            {contact.label}
                          </div>
                          {contact.comment ? (
                            <div className="mb-1 text-xs text-gray-600">
                              {contact.comment}
                            </div>
                          ) : null}
                          {contact.client &&
                            formatClientContactLines(contact.client).map(
                              (line) => (
                                <div
                                  key={line}
                                  className="text-xs text-gray-600"
                                >
                                  {line}
                                </div>
                              )
                            )}
                          {contact.client && (
                            <div
                              className="mt-1"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <ContactsIconsButtons
                                user={contact.client}
                                showChat
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionBlock>
            )}

            {additionalEvents.length > 0 && (
              <SectionBlock title="Доп. события">
                <div className="flex flex-col gap-3">
                  {additionalEventGroups.map((group) => (
                    <section key={group.key} className="flex flex-col gap-2">
                      <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        {group.label}
                      </div>
                      <div className="tablet:grid-cols-2 laptop:grid-cols-3 grid grid-cols-1 gap-2">
                        {group.items.map((item) => {
                          const originalIndex = item.originalIndex
                          return (
                            <AdditionalEventCard
                              key={`additional-event-view-${originalIndex}`}
                              item={item}
                              index={originalIndex}
                              onOpen={() =>
                                openAdditionalEventView(originalIndex)
                              }
                              onOpenEvent={() => modalsFunc.event?.view(event?._id)}
                              onToggleDone={toggleAdditionalEventDone}
                              onEdit={editAdditionalEvent}
                              onDelete={confirmDeleteAdditionalEvent}
                            />
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </SectionBlock>
            )}
            {event?.address && event.address?.town && event.address?.street && (
              <SectionBlock title="Навигация">
                <TextLine label="Ссылки для навигатора">
                  <a
                    data-tip="Открыть адрес в 2ГИС"
                    href={`https://2gis.ru/search/${event.address.town},%20${
                      event.address.street
                    }%20${event.address.house.replaceAll('/', '%2F')}`}
                  >
                    <Image
                      className="h-6 min-h-6 w-6 min-w-6 object-contain"
                      src="/img/navigators/2gis.webp"
                      alt="2gis"
                      width={24}
                      height={24}
                    />
                  </a>
                  <a
                    data-tip="Открыть адрес в Яндекс Навигаторе"
                    href={`yandexnavi://map_search?text=${
                      event.address.town
                    },%20${
                      event.address.street
                    }%20${event.address.house.replaceAll('/', '%2F')}`}
                  >
                    <Image
                      className="h-6 min-h-6 w-6 min-w-6 object-contain"
                      src="/img/navigators/yandex.webp"
                      alt="yandex"
                      width={24}
                      height={24}
                    />
                  </a>
                </TextLine>
              </SectionBlock>
            )}
          </div>
        </div>
      </div>
    )
  }

  return {
    title: `Мероприятие`,
    confirmButtonName: 'Записаться',
    Children: EventViewModal,
  }
}

export default eventViewFunc
