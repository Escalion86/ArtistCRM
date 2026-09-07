import { useEffect } from 'react'
import CardButtons from '@components/CardButtons'
import formatDateTime from '@helpers/formatDateTime'
import {
  getEventAddressLine,
  getEventTitle,
} from '@helpers/upcomingEventsOverview'

const EVENT_STATUS_LABELS = Object.freeze({
  draft: 'Заявка',
  active: 'Подтверждено',
  canceled: 'Отменено',
  closed: 'Закрыто',
})

const DetailBlock = ({ label, children }) => (
  <div className="event-view-kpi rounded-lg border border-gray-200 bg-gray-50 p-3">
    <div className="text-xs tracking-wide text-gray-500 uppercase">{label}</div>
    <div className="mt-1">{children}</div>
  </div>
)

const EventReferenceCard = ({ event, onOpen }) => {
  const address = getEventAddressLine(event)
  const statusLabel = EVENT_STATUS_LABELS[event?.status] || 'Мероприятие'

  return (
    <button
      type="button"
      className="event-view-kpi hover:border-general focus:ring-general/30 group w-full cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:bg-white hover:shadow-sm focus:ring-2 focus:outline-none"
      onClick={onOpen}
      aria-label={`Открыть мероприятие «${getEventTitle(event)}»`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Связанное мероприятие
        </div>
        <div className="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          {statusLabel}
        </div>
      </div>
      <div className="mt-1 text-base font-semibold text-gray-900">
        {getEventTitle(event)}
      </div>
      <div className="mt-1 text-sm text-gray-700">
        {event?.eventDate ? formatDateTime(event.eventDate) : 'Дата не указана'}
      </div>
      {address ? <div className="text-sm text-gray-600">{address}</div> : null}
      <div className="text-general mt-2 text-xs font-semibold">
        Открыть мероприятие →
      </div>
    </button>
  )
}

const openEventAdditionalEventViewModal = ({
  modalsFunc,
  event,
  item,
  index,
  onToggleDone,
  onEdit,
  onDelete,
  onOpenEvent,
}) => {
  if (!modalsFunc?.add || !item) return
  const displayDate = item?.done ? item?.doneAt ?? item?.date : item?.date
  const displayDateLabel = item?.done ? 'Дата выполнения' : 'Дата и время'

  const AdditionalEventViewContent = ({ closeModal, setTopLeftComponent }) => {
    const handleOpenEvent = () => {
      closeModal?.()
      setTimeout(() => onOpenEvent?.(event), 150)
    }

    useEffect(() => {
      if (!setTopLeftComponent) return
      setTopLeftComponent(() => (
        <CardButtons
          item={{
            _id: `${event?._id || 'event'}-additional-${index}`,
            status: 'active',
          }}
          typeOfItem="event"
          minimalActions
          alwaysCompact
          dropDownPlacement="left"
          showAdditionalEventsButton={false}
          showCopyIdButton={false}
          showCloneButton={false}
          showHistoryButton={false}
          showStatusButton={false}
          onEdit={() => {
            closeModal?.()
            onEdit?.(index)
          }}
          onDelete={() =>
            modalsFunc.confirm({
              title: 'Удаление задачи',
              text: 'Удалить эту задачу?',
              onConfirm: async () => {
                await onDelete?.(index)
                closeModal?.()
              },
            })
          }
        />
      ))
    }, [closeModal, setTopLeftComponent])

    return (
      <div className="flex flex-col gap-3 text-sm text-gray-800">
        <EventReferenceCard event={event} onOpen={handleOpenEvent} />
        <DetailBlock label="Статус">
          <div
            className={`text-sm font-semibold ${
              item?.done ? 'text-emerald-700' : 'text-blue-700'
            }`}
          >
            {item?.done ? 'Выполнено' : 'Активно'}
          </div>
        </DetailBlock>
        <DetailBlock label={displayDateLabel}>
          <div className="font-semibold text-gray-900">
            {formatDateTime(displayDate)}
          </div>
        </DetailBlock>
        {item?.description ? (
          <DetailBlock label="Описание">
            <div className="whitespace-pre-wrap text-gray-700">
              {item.description}
            </div>
          </DetailBlock>
        ) : null}
      </div>
    )
  }

  modalsFunc.add({
    title: item?.title || `Событие #${index + 1}`,
    confirmButtonName: item?.done ? 'Возобновить' : 'Выполнено',
    declineButtonName: 'Закрыть',
    showDecline: true,
    onConfirm: () => onToggleDone?.(index),
    Children: AdditionalEventViewContent,
  })
}

export default openEventAdditionalEventViewModal
