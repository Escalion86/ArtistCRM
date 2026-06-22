import { useEffect } from 'react'
import CardButtons from '@components/CardButtons'
import formatDateTime from '@helpers/formatDateTime'

const DetailBlock = ({ label, children }) => (
  <div className="event-view-kpi rounded-lg border border-gray-200 bg-gray-50 p-3">
    <div className="text-xs tracking-wide text-gray-500 uppercase">{label}</div>
    <div className="mt-1">{children}</div>
  </div>
)

const openEventAdditionalEventViewModal = ({
  modalsFunc,
  event,
  item,
  index,
  onToggleDone,
  onEdit,
  onDelete,
}) => {
  if (!modalsFunc?.add || !item) return
  const displayDate = item?.done ? item?.doneAt ?? item?.date : item?.date
  const displayDateLabel = item?.done ? 'Дата выполнения' : 'Дата и время'

  const AdditionalEventViewContent = ({ closeModal, setTopLeftComponent }) => {
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
              title: 'Удаление доп. события',
              text: 'Удалить это доп. событие?',
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
