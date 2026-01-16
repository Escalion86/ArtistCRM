import { faQuestion } from '@fortawesome/free-solid-svg-icons/faQuestion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { EVENT_STATUSES_WITH_TIME } from '@helpers/constants'
import eventStatusFunc from '@helpers/eventStatus'
// import eventFullAtomAsync from '@state/async/eventFullAtomAsync'
import cn from 'classnames'
import { useAtomValue } from 'jotai'
import TextLinesLimiter from './TextLinesLimiter'
import eventSelector from '@state/selectors/eventSelector'
import formatAddress from '@helpers/formatAddress'

const EventNameById = ({ eventId, showStatus, className }) => {
  const event = useAtomValue(eventSelector(eventId))

  if (!eventId) return null
  const eventStatus = eventStatusFunc(event)

  const eventStatusProps = EVENT_STATUSES_WITH_TIME.find(
    (payTypeItem) => payTypeItem.value === eventStatus
  )

  return (
    <div className={cn('flex items-center gap-x-1 leading-[14px]', className)}>
      {showStatus && (
        <div
          className={cn(
            'flex w-4 items-center justify-center',
            eventStatusProps
              ? 'text-' + eventStatusProps.color
              : 'text-disabled'
          )}
        >
          <FontAwesomeIcon
            icon={eventStatusProps?.icon ?? faQuestion}
            className="w-4 h-4"
          />
        </div>
      )}
      <TextLinesLimiter lines={1}>
        {formatAddress(event?.address, 'Мероприятие')}
      </TextLinesLimiter>
    </div>
  )
}

EventNameById.displayName = 'EventNameById'

export default EventNameById
