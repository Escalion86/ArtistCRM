import { useState } from 'react'
import cn from 'classnames'
import SurfaceCard from '@components/SurfaceCard'
import DropDown from '@components/DropDown'
import formatDateTime from '@helpers/formatDateTime'
import {
  faCalendarAlt,
  faCircleCheck,
  faEllipsisV,
  faSpinner,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const stopPropagation = (callback) => (event) => {
  event.stopPropagation()
  callback?.()
}

const ACTION_TONE = {
  blue: 'text-blue-500 hover:bg-blue-600 hover:text-white',
  orange: 'text-orange-500 hover:bg-orange-600 hover:text-white',
  red: 'text-red-500 hover:bg-red-600 hover:text-white',
}

const AdditionalEventActionItem = ({ icon, label, tone = 'blue', onClick }) => (
  <button
    type="button"
    className={cn(
      'flex h-9 w-full cursor-pointer items-center gap-2 bg-white px-2 text-left text-sm font-medium whitespace-nowrap transition',
      ACTION_TONE[tone] || ACTION_TONE.blue
    )}
    onClick={stopPropagation(onClick)}
  >
    <FontAwesomeIcon icon={icon} className="h-4 w-4 min-w-4" />
    {label}
  </button>
)

const AdditionalEventCard = ({
  item,
  index,
  onOpen,
  onOpenEvent,
  onToggleDone,
  onEdit,
  onDelete,
  children,
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
              {children ? <div className="mt-1">{children}</div> : null}
            </div>
            <div
              className="shrink-0"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <DropDown
                placement="right"
                renderInPortal
                menuPadding={false}
                menuClassName="flex-col items-stretch justify-start overflow-hidden"
                trigger={
                  <button
                    type="button"
                    className="text-general flex h-8 min-h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-transparent p-0 transition hover:border-general/30 hover:bg-general/10"
                    aria-label="Открыть меню задачи"
                  >
                    <FontAwesomeIcon
                      icon={faEllipsisV}
                      className="h-4 min-h-4 w-4"
                    />
                  </button>
                }
              >
                <AdditionalEventActionItem
                  icon={faCalendarAlt}
                  label="Посмотреть мероприятие"
                  tone="blue"
                  onClick={onOpenEvent}
                />
                <AdditionalEventActionItem
                  icon={faPencilAlt}
                  label="Редактировать"
                  tone="orange"
                  onClick={() => onEdit?.(index)}
                />
                <AdditionalEventActionItem
                  icon={faTrashAlt}
                  label="Удалить"
                  tone="red"
                  onClick={() => onDelete?.(index)}
                />
              </DropDown>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}

export default AdditionalEventCard
