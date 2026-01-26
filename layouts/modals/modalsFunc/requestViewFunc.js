import { AUDIENCE, EVENT_TYPES } from '@helpers/constants'
import formatAddress from '@helpers/formatAddress'
import requestSelector from '@state/selectors/requestSelector'
import DOMPurify from 'isomorphic-dompurify'
import { useAtomValue } from 'jotai'
import servicesAtom from '@state/atoms/servicesAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import CardButtons from '@components/CardButtons'
import { useEffect, useMemo } from 'react'

const CardButtonsComponent = ({ request }) => (
  <CardButtons
    item={request}
    typeOfItem="request"
    showEditButton={false}
    showDeleteButton={!request?.eventId}
    calendarLink={request?.calendarLink}
    dropDownPlacement="left"
  />
)

const requestViewFunc = (requestId) => {
  const RequestViewModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
    setTopLeftComponent,
  }) => {
    const request = useAtomValue(requestSelector(requestId))
    const services = useAtomValue(servicesAtom)
    const clients = useAtomValue(clientsAtom)

    if (!requestId || !request)
      return (
        <div className="flex w-full justify-center text-lg ">
          ОШИБКА! Заявка не найдена!
        </div>
      )

    const requestAudience =
      AUDIENCE.find((item) => item.value === request.audience)?.name ??
      undefined
    const requestType =
      EVENT_TYPES.find((item) => item.value === request.type)?.name ?? undefined
    const serviceTitles = (request?.servicesIds ?? [])
      .map((serviceId) => services.find((item) => item._id === serviceId))
      .filter(Boolean)
      .map((service) => service.title)
    const otherContacts = useMemo(() => {
      const contacts = Array.isArray(request?.otherContacts)
        ? request.otherContacts
        : []
      return contacts
        .map((contact) => {
          const client = clients.find(
            (item) => item._id === contact?.clientId
          )
          const name = [client?.firstName, client?.secondName]
            .filter(Boolean)
            .join(' ')
          if (!name && !contact?.clientId) return null
          return `${name || contact.clientId}${
            contact?.comment ? ` (${contact.comment})` : ''
          }`
        })
        .filter(Boolean)
    }, [clients, request?.otherContacts])

    useEffect(() => {
      if (setTopLeftComponent)
        setTopLeftComponent(() => <CardButtonsComponent request={request} />)
    }, [request, setTopLeftComponent])

    return (
      <div className="flex flex-col">
        <div className="relative flex flex-1 flex-col items-start justify-center px-1 text-sm text-black">
          {!setTopLeftComponent && (
            <div className="absolute right-0 top-0">
              <CardButtonsComponent request={request} />
            </div>
          )}
          <div className="flex gap-x-1">
            <div className="font-bold">Тип:</div>
            <div>{requestType}</div>
          </div>
          <div className="flex gap-x-1">
            <div className="font-bold">Аудитория:</div>
            <div>{requestAudience}</div>
          </div>
          <div className="flex gap-x-1">
            <div className="font-bold">Кол-во зрителей:</div>
            <div>{request?.spectators}</div>
          </div>
          {(request?.address || request?.location) && (
            <div className="flex gap-x-1">
              <div className="font-bold">Адрес:</div>
              <div>{formatAddress(request?.address, request?.location)}</div>
            </div>
          )}
          {serviceTitles.length > 0 && (
            <div className="flex gap-x-1">
              <div className="font-bold">Услуги:</div>
              <div>{serviceTitles.join(', ')}</div>
            </div>
          )}
          {request?.contactChannels?.length > 0 && (
            <div className="flex gap-x-1">
              <div className="font-bold">Способ связи:</div>
              <div>{request.contactChannels.join(', ')}</div>
            </div>
          )}
          {request?.clientPhone && (
            <div className="flex gap-x-1">
              <div className="font-bold">Телефон:</div>
              <div>+{request.clientPhone}</div>
            </div>
          )}
          {request?.comment && (
            <div className="flex gap-x-1">
              <div className="font-bold">Комментарий:</div>
              <div>{request.comment}</div>
            </div>
          )}
          {otherContacts.length > 0 && (
            <div className="flex gap-x-1">
              <div className="font-bold">Прочие контакты:</div>
              <div>{otherContacts.join(', ')}</div>
            </div>
          )}
          <div className="flex gap-x-1">
            <div className="font-bold">Юр. лицо:</div>
            <div>{request?.official === false ? 'Нет' : 'Да'}</div>
          </div>
        </div>
      </div>
    )
  }

  return {
    title: `Заявка`,
    confirmButtonName: 'Закрыть',
    showDecline: false,
    onConfirm: true,
    Children: RequestViewModal,
  }
}

export default requestViewFunc
