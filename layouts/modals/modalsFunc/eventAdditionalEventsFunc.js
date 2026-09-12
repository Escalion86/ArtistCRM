import { useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { modalsFuncAtom } from '@state/atoms'
import SurfaceCard from '@components/SurfaceCard'
import AppButton from '@components/AppButton'
import { getAdditionalEventsDisplayGroups } from '@helpers/additionalEvents'
import openEventAdditionalEventEditorModal from './eventAdditionalEventEditorModal'
import AdditionalEventCard, {
  AdditionalEventCardSkeleton,
} from './AdditionalEventCard'
import openEventAdditionalEventViewModal from './eventAdditionalEventViewModal'
import { useEventQuery } from '@helpers/useEventsQuery'

const eventAdditionalEventsFunc = (eventId) => {
  const EventAdditionalEventsModal = () => {
    const { data: event } = useEventQuery(eventId)
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const [pendingAdditionalEvent, setPendingAdditionalEvent] = useState(null)

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
          setPendingAdditionalEvent({ type: 'create' })
          try {
            await updateAdditionalEvents([...sourceItems, nextItem])
          } finally {
            setPendingAdditionalEvent(null)
          }
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
          setPendingAdditionalEvent({ type: 'edit', index })
          try {
            await updateAdditionalEvents(nextItems)
          } finally {
            setPendingAdditionalEvent(null)
          }
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
        title: 'Удаление задачи',
        text: 'Удалить эту задачу?',
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
        onOpenEvent: () => modalsFunc.event?.view(event?._id),
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
            Всего:{' '}
            {additionalEvents.length +
              (pendingAdditionalEvent?.type === 'create' ? 1 : 0)}
          </div>
          <AppButton
            variant="secondary"
            size="sm"
            className="rounded"
            onClick={handleCreateAdditionalEvent}
          >
            Создать задачу
          </AppButton>
        </div>
        {pendingAdditionalEvent?.type === 'create' ? (
          <AdditionalEventCardSkeleton />
        ) : null}
        {additionalEvents.length === 0 && !pendingAdditionalEvent ? (
          <SurfaceCard className="text-sm text-gray-500">
            Задач пока нет
          </SurfaceCard>
        ) : additionalEvents.length > 0 ? (
          <div className="flex flex-col gap-3">
            {additionalEventGroups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const originalIndex = item.originalIndex

                  return pendingAdditionalEvent?.type === 'edit' &&
                    pendingAdditionalEvent.index === originalIndex ? (
                    <AdditionalEventCardSkeleton
                      key={`additional-event-item-${originalIndex}-pending`}
                    />
                  ) : (
                    <AdditionalEventCard
                      key={`additional-event-item-${originalIndex}`}
                      item={item}
                      index={originalIndex}
                      onOpen={() => handleOpenAdditionalEvent(originalIndex)}
                      onOpenEvent={() => modalsFunc.event?.view(event?._id)}
                      onToggleDone={handleToggleAdditionalEventDone}
                      onEdit={handleEditAdditionalEvent}
                      onDelete={handleDeleteAdditionalEvent}
                    />
                  )
                })}
              </section>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return {
    title: 'Задачи/События',
    confirmButtonName: 'Закрыть',
    onConfirm: true,
    showDecline: false,
    Children: EventAdditionalEventsModal,
  }
}

export default eventAdditionalEventsFunc
