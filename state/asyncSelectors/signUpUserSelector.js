import { atom } from 'jotai'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import asyncEventsUsersAllAtom from './asyncEventsUsersAllAtom'
import asyncEventsUsersByEventIdAtom from './asyncEventsUsersByEventIdAtom'
import asyncEventsUsersByUserIdAtom from './asyncEventsUsersByUserIdAtom'

const signUpUserSelector = atom(null, (get, set, newEventUser) => {
  if (!newEventUser) return
  const { eventId, userId } = newEventUser

  const isLoadedEventId = get(isLoadedAtom('asyncEventsUsersByEventIdAtom' + eventId))
  if (isLoadedEventId) {
    const eventUsers = get(asyncEventsUsersByEventIdAtom(eventId))
    const newEventUsers = [...eventUsers, newEventUser]
    set(asyncEventsUsersByEventIdAtom(eventId), newEventUsers)
  }

  const isLoadedUserId = get(isLoadedAtom('asyncEventsUsersByUserIdAtom' + userId))
  if (isLoadedUserId) {
    const eventsUser = get(asyncEventsUsersByUserIdAtom(userId))
    const newEventsUser = [...eventsUser, newEventUser]
    set(asyncEventsUsersByUserIdAtom(userId), newEventsUser)
  }

  const isLoadedEventsUsersAll = get(isLoadedAtom('asyncEventsUsersAllAtom'))
  if (!isLoadedEventsUsersAll) return

  const eventsUsers = get(asyncEventsUsersAllAtom)
  const newEventsUserList = [...eventsUsers, newEventUser]

  set(asyncEventsUsersAllAtom, newEventsUserList)
})

export default signUpUserSelector
