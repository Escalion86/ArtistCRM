import getDiffBetweenDates from './getDiffBetweenDates'

const isEventExpired = (event) => {
  const serverDate = new Date()
  return getDiffBetweenDates(event?.dateEnd, serverDate) >= 0
}

export default isEventExpired
