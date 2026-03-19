import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import eventSelector from '@state/selectors/eventSelector'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { modalsFuncAtom } from '@state/atoms'
import SurfaceCard from '@components/SurfaceCard'
import AppButton from '@components/AppButton'
import IconActionButton from '@components/IconActionButton'
import formatDateTime from '@helpers/formatDateTime'
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import openEventAdditionalEventEditorModal from './eventAdditionalEventEditorModal'

const eventAdditionalEventsFunc = (eventId) => {
  const EventAdditionalEventsModal = () => {
    const event = useAtomValue(eventSelector(eventId))
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)

    const additionalEvents = useMemo(
      () =>
        Array.isArray(event?.additionalEvents) ? event.additionalEvents : [],
      [event?.additionalEvents]
    )

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

    const handleCreateAdditionalEvent = () => {
      openEventAdditionalEventEditorModal({
        modalsFunc,
        index: null,
        onConfirm: async (nextItem) => {
          const sourceItems = Array.isArray(event?.additionalEvents)
            ? event.additionalEvents
            : []
          await updateAdditionalEvents([...sourceItems, nextItem])
        },
      })
    }

    const handleEditAdditionalEvent = (index) => {
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

    const handleToggleAdditionalEventDone = async (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const target = sourceItems[index]
      if (!target) return
      const nextItems = sourceItems.map((item, idx) =>
        idx === index ? { ...item, done: !Boolean(item?.done) } : item
      )
      await updateAdditionalEvents(nextItems)
    }

    const handleDeleteAdditionalEvent = (index) => {
      const sourceItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const target = sourceItems[index]
      if (!target) return
      modalsFunc?.confirm?.({
        title: 'Удаление доп. события',
        text: 'Удалить это доп. событие?',
        onConfirm: async () => {
          const currentItems = Array.isArray(event?.additionalEvents)
            ? event.additionalEvents
            : []
          const nextItems = currentItems.filter((_, idx) => idx !== index)
          await updateAdditionalEvents(nextItems)
        },
      })
    }

    if (!event?._id) {
      return (
        <div className="py-4 text-sm text-center text-red-600">
          Мероприятие не найдено
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-gray-700">
            Всего: {additionalEvents.length}
          </div>
          <AppButton
            variant="secondary"
            size="sm"
            className="rounded"
            onClick={handleCreateAdditionalEvent}
          >
            Создать доп. событие
          </AppButton>
        </div>
        {additionalEvents.length === 0 ? (
          <SurfaceCard className="text-sm text-gray-500">
            Доп. событий пока нет
          </SurfaceCard>
        ) : (
          <div className="flex flex-col gap-2">
            {additionalEvents.map((item, index) => (
              <SurfaceCard
                key={`additional-event-item-${index}`}
                className={
                  item?.done
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-gray-200'
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
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
                      <div className="text-xs text-gray-700 whitespace-pre-wrap">
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AppButton
                      variant={item?.done ? 'secondary' : 'primary'}
                      size="sm"
                      className="rounded"
                      onClick={() => handleToggleAdditionalEventDone(index)}
                    >
                      {item?.done ? 'Вернуть' : 'Сделано'}
                    </AppButton>
                    <IconActionButton
                      icon={faPencilAlt}
                      onClick={() => handleEditAdditionalEvent(index)}
                      title="Редактировать событие"
                      variant="warning"
                      size="xs"
                      className="min-h-8 min-w-8"
                    />
                    <IconActionButton
                      icon={faTrashAlt}
                      onClick={() => handleDeleteAdditionalEvent(index)}
                      title="Удалить событие"
                      variant="danger"
                      size="xs"
                      className="min-h-8 min-w-8"
                    />
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
    )
  }

  return {
    title: 'Доп. события',
    confirmButtonName: 'Закрыть',
    onConfirm: true,
    showDecline: false,
    Children: EventAdditionalEventsModal,
  }
}

export default eventAdditionalEventsFunc
