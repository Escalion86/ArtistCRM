import CardButtons from '@components/CardButtons'
import Chip from '@components/Chips/Chip'
import cn from 'classnames'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import Divider from '@components/Divider'
import ImageGallery from '@components/ImageGallery'
import TextLine from '@components/TextLine'
import UserName from '@components/UserName'
import formatAddress from '@helpers/formatAddress'
import formatDateTime from '@helpers/formatDateTime'
import formatMinutes from '@helpers/formatMinutes'
import getEventDuration from '@helpers/getEventDuration'
import Image from 'next/image'
import eventSelector from '@state/selectors/eventSelector'
import userSelector from '@state/selectors/userSelector'
import DOMPurify from 'isomorphic-dompurify'
import { useEffect, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import servicesAtom from '@state/atoms/servicesAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'

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

    const organizer = useAtomValue(userSelector(event?.organizerId))

    const duration = getEventDuration(event)
    const additionalEvents = Array.isArray(event?.additionalEvents)
      ? event.additionalEvents
      : []

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
          const name = [client?.firstName, client?.secondName]
            .filter(Boolean)
            .join(' ')
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
      <div className="flex flex-col gap-y-2">
        <ImageGallery images={event?.images} />
        <div className="flex flex-1 flex-col">
          <div className="flex w-full max-w-full flex-1 flex-col gap-y-1 px-2 py-2">
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
            <div className="flex w-full justify-center text-3xl font-bold">
              {formatAddress(displayAddress, 'Мероприятие')}
            </div>
            <div
              className="textarea ql w-full max-w-full list-disc overflow-hidden"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(event?.description),
              }}
            />
            <Divider thin light />
            <TextLine label="ID">{event?._id}</TextLine>
            <TextLine label="Дата создания заявки">
              {formatDateTime(event?.requestCreatedAt ?? event?.createdAt)}
            </TextLine>
            <TextLine label="Начало">
              {formatDateTime(event?.dateStart)}
            </TextLine>
            <TextLine label="Завершение">
              {formatDateTime(event?.dateEnd)}
            </TextLine>
            <TextLine label="Продолжительность">
              {formatMinutes(duration ?? 60)}
            </TextLine>

            {event?.address && (
              <TextLine label="Адрес">
                {formatAddress(displayAddress, '[не указан]')}
              </TextLine>
            )}
            {serviceTitles.length > 0 && (
              <TextLine label="Услуги">{serviceTitles.join(', ')}</TextLine>
            )}
            {otherContacts.length > 0 && (
              <TextLine label="Прочие контакты">
                <div className="flex flex-col gap-2">
                  {otherContacts.map((contact, index) => (
                    <div key={`${contact.label}-${index}`}>
                      <div className="text-sm text-gray-800">
                        {contact.label}
                        {contact.comment ? ` (${contact.comment})` : ''}
                      </div>
                      {contact.client && (
                        <ContactsIconsButtons user={contact.client} />
                      )}
                    </div>
                  ))}
                </div>
              </TextLine>
            )}
            {additionalEvents.length > 0 && (
              <TextLine label="Доп. события">
                <div className="flex flex-col gap-2">
                  {additionalEvents.map((item, index) => (
                    <div
                      key={`additional-event-view-${index}`}
                      className="rounded border border-gray-200 px-2 py-1"
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {item?.title || `Событие #${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDateTime(item?.date)}
                      </div>
                      {item?.description ? (
                        <div className="text-sm text-gray-700">
                          {item.description}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </TextLine>
            )}
            {event?.address && event.address?.town && event.address?.street && (
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
            )}
            {event?.organizerId && (
              <>
                <TextLine label="Организатор">
                  <UserName user={organizer} noWrap />
                </TextLine>
                <TextLine label="Контакты организатора">
                  <ContactsIconsButtons user={organizer} />
                </TextLine>
              </>
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
