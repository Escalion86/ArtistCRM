import { atom } from 'jotai'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import asyncEventsUsersAllAtom from './asyncEventsUsersAllAtom'
import asyncEventsUsersByEventIdAtom from './asyncEventsUsersByEventIdAtom'
import asyncEventsUsersByUserIdAtom from './asyncEventsUsersByUserIdAtom'

const setEventUserSelector = atom(
  null,
  (get, set, updateEventUser) => {
    if (!updateEventUser) return
    const { _id, eventId, userId } = updateEventUser

    const isLoadedEventId = get(isLoadedAtom('asyncEventsUsersByEventIdAtom' + eventId))
    if (isLoadedEventId) {
      const eventUsers = get(asyncEventsUsersByEventIdAtom(eventId))
      const updatedEventUsers = eventUsers.map((eventUser) =>
        eventUser._id === _id ? updateEventUser : eventUser
      )
      set(asyncEventsUsersByEventIdAtom(eventId), updatedEventUsers)
    }

    const isLoadedUserId = get(isLoadedAtom('asyncEventsUsersByUserIdAtom' + userId))
    if (isLoadedUserId) {
      const eventsUser = get(asyncEventsUsersByUserIdAtom(userId))
      const updatedEventsUser = eventsUser.map((eventUser) =>
        eventUser._id === _id ? updateEventUser : eventUser
      )
      set(asyncEventsUsersByUserIdAtom(userId), updatedEventsUser)
    }

    const isLoadedEventsUsersAll = get(isLoadedAtom('asyncEventsUsersAllAtom'))
    if (isLoadedEventsUsersAll) {
      const eventsUsers = get(asyncEventsUsersAllAtom)
      const updatedEventsUser = eventsUsers.map((eventUser) =>
        eventUser._id === _id ? updateEventUser : eventUser
      )

      set(asyncEventsUsersAllAtom, updatedEventsUser)
    }
  }
)

export default setEventUserSelector
