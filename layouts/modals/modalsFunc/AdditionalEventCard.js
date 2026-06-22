import { useState } from 'react'
import cn from 'classnames'
import SurfaceCard from '@components/SurfaceCard'
import IconActionButton from '@components/IconActionButton'
import formatDateTime from '@helpers/formatDateTime'
import {
  faCircleCheck,
  faSpinner,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const stopPropagation = (callback) => (event) => {
  event.stopPropagation()
  callback?.()
}

const AdditionalEventCard = ({
  item,
  index,
  onOpen,
  onToggleDone,
  onEdit,
  onDelete,
}) => {
  const [isToggleSaving, setIsToggleSaving] = useState(false)
  const isClickable = typeof onOpen === 'function'
  const title = item?.title || `Событие #${index + 1}`
  const displayDate = item?.displayDate ?? (item?.done ? item?.doneAt : item?.date)
  const displayDateLabel = item?.displayDateLabel || (item?.done ? 'Выполнено' : '')

  const handleToggleDoneClick = async () => {
    if (isToggleSaving) return
    setIsToggleSaving(true)
    try {
      await onToggleDone?.(index)
    } finally {
      setIsToggleSaving(false)
    }
  }

  const handleKeyDown = (event) => {
    if (!isClickable || event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpen()
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        'rounded-xl outline-none',
        isClickable ? 'cursor-pointer focus:ring-2 focus:ring-general/30' : ''
      )}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <SurfaceCard
        className={cn(
          'additional-event-list-card transition',
          item?.done
            ? 'additional-event-list-card--done border-emerald-200 bg-emerald-50/60'
            : 'border-gray-200'
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            disabled={isToggleSaving}
            aria-busy={isToggleSaving}
            onClick={stopPropagation(handleToggleDoneClick)}
            title={
              isToggleSaving
                ? 'Сохраняем'
                : item?.done
                  ? 'Отметить как не выполнено'
                  : 'Отметить как выполнено'
            }
            aria-label={
              isToggleSaving
                ? 'Сохраняем изменение'
                : item?.done
                  ? 'Отметить как не выполнено'
                  : 'Отметить как выполнено'
            }
            className={`additional-event-list-check mt-0.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border transition ${
              isToggleSaving
                ? 'cursor-wait border-gray-300 bg-gray-100 text-gray-500 opacity-80'
                : item?.done
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 bg-white text-gray-400 hover:border-emerald-400 hover:text-emerald-500'
            }`}
          >
            <FontAwesomeIcon
              icon={isToggleSaving ? faSpinner : faCircleCheck}
              className={isToggleSaving ? 'animate-spin' : ''}
            />
          </button>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-sm font-semibold ${
                  item?.done ? 'text-emerald-700' : 'text-gray-900'
                }`}
              >
                {item?.done ? '✓ ' : ''}
                {title}
              </div>
              <div className="text-xs text-gray-600">
                {displayDateLabel ? `${displayDateLabel}: ` : ''}
                {formatDateTime(displayDate)}
              </div>
              {item?.description ? (
                <div className="text-xs text-gray-700 whitespace-pre-wrap">
                  {item.description}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconActionButton
                icon={faPencilAlt}
                onClick={stopPropagation(() => onEdit?.(index))}
                title="Редактировать доп. событие"
                variant="warning"
                size="xs"
                className="min-h-8 min-w-8"
              />
              <IconActionButton
                icon={faTrashAlt}
                onClick={stopPropagation(() => onDelete?.(index))}
                title="Удалить доп. событие"
                variant="danger"
                size="xs"
                className="min-h-8 min-w-8"
              />
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}

export default AdditionalEventCard
