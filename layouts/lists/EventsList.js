import EventCard from '@layouts/cards/EventCard'
import windowDimensionsAtom from '@state/atoms/windowDimensionsAtom'
import { useAtomValue } from 'jotai'
import ListWrapper from './ListWrapper'

const EventsList = ({ events, onTagClick }) => {
  const widthNum = useAtomValue(windowDimensionsAtom)

  return (
    <ListWrapper
      itemCount={events.length}
      itemSize={widthNum > 3 ? 166 : widthNum === 3 ? 174 : 221}
      className="bg-opacity-15 bg-general"
    >
      {({ index, style }) => (
        <EventCard
          style={style}
          key={events[index]._id}
          eventId={events[index]._id}
          onTagClick={onTagClick}
        />
      )}
    </ListWrapper>
  )
}

export default EventsList
