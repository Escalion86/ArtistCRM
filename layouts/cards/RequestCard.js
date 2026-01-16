import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import { CardWrapper } from '@components/CardWrapper'
// import EventTagsChipsLine from '@components/Chips/EventTagsChipsLine'
// import DateTimeEvent from '@components/DateTimeEvent'
// import EventButtonSignIn from '@components/EventButtonSignIn'
// import EventUsersCounterAndAge from '@components/EventUsersCounterAndAge'
// import PriceDiscount from '@components/PriceDiscount'
// import TextLinesLimiter from '@components/TextLinesLimiter'
import {
  AUDIENCE,
  EVENT_TYPES,
  // eventAudiences,
  // eventTypes,
} from '@helpers/constants'
// import eventStatusFunc from '@helpers/eventStatus'
import formatDate from '@helpers/formatDate'
import formatAddress from '@helpers/formatAddress'
import { modalsFuncAtom } from '@state/atoms'
import errorAtom from '@state/atoms/errorAtom'
// import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import loadingAtom from '@state/atoms/loadingAtom'
import requestSelector from '@state/selectors/requestSelector'
import clientSelector from '@state/selectors/clientSelector'
import windowDimensionsNumSelector from '@state/selectors/windowDimensionsNumSelector'
import cn from 'classnames'
import { useAtomValue } from 'jotai'

const RequestCard = ({
  requestId,
  noButtons,
  hidden = false,
  style,
  changeStyle = 'laptop',
}) => {
  // const widthNum = useWindowDimensionsTailwindNum()
  const widthNum = useAtomValue(windowDimensionsNumSelector)

  const modalsFunc = useAtomValue(modalsFuncAtom)
  const request = useAtomValue(requestSelector(requestId))
  const client = useAtomValue(clientSelector(request?.clientId))

  const loading = useAtomValue(loadingAtom('request' + requestId))
  const error = useAtomValue(errorAtom('request' + requestId))
  // const itemFunc = useAtomValue(itemsFuncAtom)
  // const subEventSum = useAtomValue(subEventsSumOfEventSelector(event._id))

  if (!request) return null
  const requestStatus = 'active' //eventStatusFunc(event)
  const contactUser =
    client || (request.clientPhone ? { phone: request.clientPhone } : null)
  const requestTitle = request.createdAt
    ? formatDate(request.createdAt, false, true)
    : 'Дата заявки не указана'

  const requestAudience =
    AUDIENCE.find((item) => item.value === request.audience)?.name ?? undefined
  const requestType =
    EVENT_TYPES.find((item) => item.value === request.type)?.name ?? undefined
  // const eventLoggedUserStatus = useAtomValue(
  //   loggedUserToEventStatusSelector(eventId)
  // )

  // const eventAssistants = eventUsers
  //   .filter((item) => item.user && item.status === 'assistant')
  //   .map((item) => item.user)

  // const eventAssistants = useAtomValue(eventAssistantsSelector(eventId))

  // const formatedAddress = formatAddress(event.address)
  return (
    <CardWrapper
      loading={loading}
      error={error}
      onClick={() => !loading && modalsFunc.request.edit(request._id)}
      gap={false}
      hidden={hidden}
      style={style}
    >
      <div
        className={cn(
          'relative hidden h-40 max-h-40 min-h-40 w-40 min-w-40 justify-center',
          changeStyle === 'laptop' ? 'laptop:flex' : 'desktop:flex',
          { 'laptop:w-auto': noButtons }
        )}
      >
        {requestStatus === 'canceled' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-15 border-2 border-danger bg-white bg-opacity-50 text-2xl font-bold text-danger shadow-white2">
            Отменено
          </div>
        )}
        {['finished', 'closed'].includes(requestStatus) && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-15 border-2 border-success bg-white bg-opacity-50 text-2xl font-bold text-success shadow-white2">
            Завершено
          </div>
        )}
      </div>
      <div className="relative flex w-full flex-1 flex-col justify-between">
        <div className="flex flex-1 flex-col">
          <div className="flex pl-2">
            <div className="flex h-[36px] flex-1 items-center gap-x-1">
              <div className="flex-1 font-bold text-general">
                {requestTitle}
              </div>
              {!noButtons && (
                <CardButtons
                  item={request}
                  typeOfItem="request"
                  showEditButton={false}
                  calendarLink={request.calendarLink}
                />
              )}
            </div>
            {/* <TextLinesLimiter
              className="flex-1 hidden text-lg font-bold laptop:text-xl laptop:block"
              lines={1}
            >
              {event.title}
            </TextLinesLimiter>
            {!noButtons && (
              <CardButtons
                item={event}
                typeOfItem="event"
                showOnSiteOnClick={() => {
                  itemFunc.event.set({
                    _id: event._id,
                    showOnSite: !event.showOnSite,
                  })
                }}
                className="hidden laptop:flex"
              />
            )} */}
          </div>
          <div className="flex h-[32px] min-h-[32px] flex-1">
            <div className="flex flex-1 flex-col items-start justify-center px-1 text-sm text-black">
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
              {request?.contactChannels?.length > 0 && (
                <div className="flex gap-x-1">
                  <div className="font-bold">Способ связи:</div>
                  <div>{request.contactChannels.join(', ')}</div>
                </div>
              )}
              {contactUser && <ContactsIconsButtons user={contactUser} />}
              {request?.comment && (
                <div className="flex gap-x-1">
                  <div className="font-bold">Комментарий:</div>
                  <div>{request.comment}</div>
                </div>
              )}
              <div className="flex gap-x-1">
                <div className="font-bold">Юр. лицо:</div>
                <div>{!request?.official ? 'Нет' : 'Да'}</div>
              </div>
              {/* {`Заявка с ${process.env.DOMAIN}\n${
        name ? `\n<b>Имя клиента:</b> ${name}` : ''
      }${audienceName ? `\n<b>Аудитория:</b> ${audienceName}` : ''}${
        typeName
          ? `\n<b>Тип:</b> ${typeName}${
              customType ? ' - ' + customType + ' ' : ''
            }`
          : ''
      }${date ? `\n<b>Дата:</b> ${formatDate(date, false, true)}` : ''}${
        spectators ? `\n<b>Кол-во зрителей:</b> ${spectators}` : ''
      }${town ? `\n<b>Город:</b> ${town}` : ''}${
        address ? `\n<b>Адрес:</b> ${address}` : ''
      }${contact ? `\n<b>Способ связи:</b> ${contact}` : ''}${
        comment ? `\n<b>Комментарий:</b> ${comment}` : ''
      }${phone ? `\n<b>Телефон:</b> +${phone}` : ''}${
        comment ? `\n<b>Комментарий:</b> ${comment}` : ''
      }${
        official && typeof official === 'boolean'
          ? `\n<b>Юр. лицо:</b> ${official === false ? 'Нет' : 'Да'}`
          : ''
      }`,
      `tel:+${phone}`} */}
            </div>
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}

export default RequestCard
