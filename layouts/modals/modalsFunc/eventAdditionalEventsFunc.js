import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { modalsFuncAtom } from '@state/atoms'
import SurfaceCard from '@components/SurfaceCard'
import AppButton from '@components/AppButton'
import { getAdditionalEventsDisplayGroups } from '@helpers/additionalEvents'
import openEventAdditionalEventEditorModal from './eventAdditionalEventEditorModal'
import AdditionalEventCard from './AdditionalEventCard'
import openEventAdditionalEventViewModal from './eventAdditionalEventViewModal'
import { useEventQuery } from '@helpers/useEventsQuery'

const eventAdditionalEventsFunc = (eventId) => {
  const EventAdditionalEventsModal = () => {
    const { data: event } = useEventQuery(eventId)
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)

    const additionalEvents = useMemo(
      () =>
        Array.isArray(event?.additionalEvents) ? event.additionalEvents : [],
      [event?.additionalEvents]
    )
    const additionalEventGroups = useMemo(
      () => getAdditionalEventsDisplayGroups(additionalEvents),
      [additionalEvents]
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
      const currentItems = Array.isArray(event?.additionalEvents)
        ? event.additionalEvents
        : []
      const nextItems = currentItems.filter((_, idx) => idx !== index)
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
          await deleteAdditionalEvent(index)
        },
      })
    }

    const handleOpenAdditionalEvent = (index) => {
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
        onToggleDone: handleToggleAdditionalEventDone,
        onEdit: handleEditAdditionalEvent,
        onDelete: deleteAdditionalEvent,
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
          <div className="flex flex-col gap-3">
            {additionalEventGroups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const originalIndex = item.originalIndex

                  return (
                    <AdditionalEventCard
                      key={`additional-event-item-${originalIndex}`}
                      item={item}
                      index={originalIndex}
                      onOpen={() => handleOpenAdditionalEvent(originalIndex)}
                      onToggleDone={handleToggleAdditionalEventDone}
                      onEdit={handleEditAdditionalEvent}
                      onDelete={handleDeleteAdditionalEvent}
                    />
                  )
                })}
              </section>
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
