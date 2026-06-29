import getDiffBetweenDates from './getDiffBetweenDates'

const isEventInProcess = (event) => {
  // const minutesBetween = getMinutesBetween(event.date)
  return (
    getDiffBetweenDates(event.eventDate) >= 0 &&
    getDiffBetweenDates(event.dateEnd) <= 0
  )

  // return minutesBetween >= 0 && minutesBetween <= event.duration
}
export default isEventInProcess
