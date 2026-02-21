import CardButtons from '@components/CardButtons'
import Chip from '@components/Chips/Chip'
import IconActionButton from '@components/IconActionButton'
import cn from 'classnames'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import ImageGallery from '@components/ImageGallery'
import SurfaceCard from '@components/SurfaceCard'
import TextLine from '@components/TextLine'
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import formatAddress from '@helpers/formatAddress'
import formatDateTime from '@helpers/formatDateTime'
import formatMinutes from '@helpers/formatMinutes'
import getEventDuration from '@helpers/getEventDuration'
import getPersonFullName from '@helpers/getPersonFullName'
import Image from 'next/image'
import eventSelector from '@state/selectors/eventSelector'
import DOMPurify from 'isomorphic-dompurify'
import { useEffect, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import servicesAtom from '@state/atoms/servicesAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { modalsFuncAtom } from '@state/atoms'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'

const EVENT_STATUS_META = Object.freeze({
  draft: { label: 'Заявка', className: 'event-view-status event-view-status--draft' },
  active: { label: 'Активно', className: 'event-view-status event-view-status--active' },
  canceled: { label: 'Отменено', className: 'event-view-status event-view-status--canceled' },
  finished: { label: 'Завершено', className: 'event-view-status event-view-status--finished' },
  closed: { label: 'Закрыто', className: 'event-view-status event-view-status--closed' },
})

const SectionBlock = ({ title, children }) => (
  <SurfaceCard>
    {title ? <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div> : null}
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
    const event = useAtomValue(eventSelector(eventId))
    const services = useAtomValue(servicesAtom)
    const clients = useAtomValue(clientsAtom)
    const siteSettings = useAtomValue(siteSettingsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const itemsFunc = useAtomValue(itemsFuncAtom)

    const duration = getEventDuration(event)
    const additionalEvents = Array.isArray(event?.additionalEvents)
      ? event.additionalEvents
      : []
    const statusMeta = EVENT_STATUS_META[event?.status] || EVENT_STATUS_META.active

    const calendarLink = useMemo(() => {
      if (!event?.description) return null
      const match = event.description.match(
        /https?:\/\/(?:www\.)?google\.com\/calendar\/event\?eid=\S+|https?:\/\/calendar\.google\.com\/calendar\/\S+/i
      )
      if (!match?.[0]) return null
      return match[0].replace(/[),.]+$/, '')
    }, [event?.description])
    const serviceTitles = (event?.servicesIds ?? [])
      .map((serviceId) => services.find((item) => item._id === serviceId))
      .filter(Boolean)
      .map((service) => service.title)
    const otherContacts = useMemo(() => {
      const contacts = Array.isArray(event?.otherContacts)
        ? event.otherContacts
        : []
      return contacts
        .map((contact) => {
          if (!contact?.clientId && !contact?.comment) return null
          const client = clients.find(
            (item) => item._id === contact?.clientId
          )
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

    const toggleAdditionalEventDone = async (index) => {
      if (!event?._id) return
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const target = sourceItems[index]
      if (!target) return
      const nextItems = sourceItems.map((item, idx) =>
        idx === index ? { ...item, done: !Boolean(item?.done) } : item
      )
      await itemsFunc?.event?.set(
        {
          _id: event._id,
          additionalEvents: nextItems,
        },
        false,
        true
      )
    }

    const deleteAdditionalEvent = async (index) => {
      if (!event?._id) return
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      if (!sourceItems[index]) return
      const nextItems = sourceItems.filter((_, idx) => idx !== index)
      await itemsFunc?.event?.set(
        {
          _id: event._id,
          additionalEvents: nextItems,
        },
        false,
        true
      )
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
        <div className="flex w-full justify-center text-lg ">
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
                  <CardButtonsComponent event={event} calendarLink={calendarLink} />
                </div>
              )}
            </div>
            <SectionBlock>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="break-words text-left text-lg font-bold text-gray-900 tablet:text-2xl">
                    {formatAddress(displayAddress, 'Мероприятие')}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Создано: {formatDateTime(event?.requestCreatedAt ?? event?.createdAt)}
                  </div>
                </div>
                <div className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusMeta.className}`}>
                  {statusMeta.label}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm tablet:grid-cols-3">
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
                    __html: DOMPurify.sanitize(event?.description),
                  }}
                />
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

            {otherContacts.length > 0 && (
              <SectionBlock title="Прочие контакты">
                <div className="flex flex-col gap-2">
                  {otherContacts.map((contact, index) => (
                    <div
                      key={`${contact.label}-${index}`}
                      className="event-view-kpi rounded-lg border border-gray-200 bg-gray-50 p-2"
                    >
                      <div className="text-sm font-semibold text-gray-800">
                        {contact.label}
                      </div>
                      {contact.comment ? (
                        <div className="mb-1 text-xs text-gray-600">{contact.comment}</div>
                      ) : null}
                      {contact.client && (
                        <div className="mt-1">
                          <ContactsIconsButtons user={contact.client} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionBlock>
            )}
            {additionalEvents.length > 0 && (
              <SectionBlock title="Доп. события">
                <div className="tablet:grid-cols-2 laptop:grid-cols-3 grid grid-cols-1 gap-2">
                  {additionalEvents.map((item, index) => (
                    <div
                      key={`additional-event-view-${index}`}
                      className={`w-full cursor-pointer rounded-lg border p-2 transition hover:shadow-sm ${
                        item?.done
                          ? 'event-view-additional-done border-emerald-200 bg-emerald-50'
                          : 'event-view-kpi border-gray-200 bg-gray-50'
                      }`}
                      onClick={() =>
                        modalsFunc.add({
                          title: item?.title || `Событие #${index + 1}`,
                          confirmButtonName: item?.done
                            ? 'Возобновить'
                            : 'Выполнено',
                          declineButtonName: 'Закрыть',
                          showDecline: true,
                          onConfirm: () => toggleAdditionalEventDone(index),
                          Children: ({ closeModal, setTopLeftComponent }) => {
                            useEffect(() => {
                              if (!setTopLeftComponent) return
                              setTopLeftComponent(
                                <IconActionButton
                                  icon={faTrashAlt}
                                  size="sm"
                                  variant="danger"
                                  title="Удалить доп. событие"
                                  onClick={() =>
                                    modalsFunc.confirm({
                                      title: 'Удаление доп. события',
                                      text: 'Удалить это доп. событие?',
                                      onConfirm: async () => {
                                        await deleteAdditionalEvent(index)
                                        closeModal?.()
                                      },
                                    })
                                  }
                                />
                              )
                            }, [closeModal, setTopLeftComponent])

                            return (
                              <div className="flex flex-col gap-3 text-sm text-gray-800">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <div className="text-xs uppercase tracking-wide text-gray-500">
                                    Статус
                                  </div>
                                  <div
                                    className={`mt-1 text-sm font-semibold ${
                                      item?.done
                                        ? 'text-emerald-700'
                                        : 'text-blue-700'
                                    }`}
                                  >
                                    {item?.done ? 'Выполнено' : 'Активно'}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <div className="text-xs uppercase tracking-wide text-gray-500">
                                    Дата и время
                                  </div>
                                  <div className="mt-1 font-semibold text-gray-900">
                                    {formatDateTime(item?.date)}
                                  </div>
                                </div>
                                {item?.description ? (
                                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                      Описание
                                    </div>
                                    <div className="mt-1 whitespace-pre-wrap text-gray-700">
                                      {item.description}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          },
                        })
                      }
                    >
                      <div
                        className={`truncate text-sm font-semibold ${
                          item?.done ? 'text-emerald-700' : 'text-gray-900'
                        }`}
                      >
                        {item?.done ? '✓ ' : ''}
                        {item?.title || `Событие #${index + 1}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDateTime(item?.date)}
                      </div>
                      {item?.description ? (
                        <div className="text-xs text-gray-700">
                          {item.description}
                        </div>
                      ) : null}
                    </div>
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
                      src="/img/navigators/2gis.png"
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
                      src="/img/navigators/yandex.png"
                      alt="2gis"
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
