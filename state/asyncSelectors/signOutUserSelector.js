import { atom } from 'jotai'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import asyncEventsUsersAllAtom from './asyncEventsUsersAllAtom'
import asyncEventsUsersByEventIdAtom from './asyncEventsUsersByEventIdAtom'
import asyncEventsUsersByUserIdAtom from './asyncEventsUsersByUserIdAtom'

const signOutUserSelector = atom(null, (get, set, delEventUser) => {
  if (!delEventUser) return
  const { eventId, userId } = delEventUser

  const isLoadedEventId = get(isLoadedAtom('asyncEventsUsersByEventIdAtom' + eventId))
  if (isLoadedEventId) {
    const eventUsers = get(asyncEventsUsersByEventIdAtom(eventId))
    const newEventUsers = eventUsers.filter(
      (eventUser) => eventUser.userId !== userId
    )
    set(asyncEventsUsersByEventIdAtom(eventId), newEventUsers)
  }

  const isLoadedUserId = get(isLoadedAtom('asyncEventsUsersByUserIdAtom' + userId))
  if (isLoadedUserId) {
    const eventsUser = get(asyncEventsUsersByUserIdAtom(userId))
    const newEventsUser = eventsUser.filter(
      (eventUser) => eventUser.eventId !== eventId
    )

    set(asyncEventsUsersByUserIdAtom(userId), newEventsUser)
  }

  const isLoadedEventsUsersAll = get(isLoadedAtom('asyncEventsUsersAllAtom'))
  if (!isLoadedEventsUsersAll) return

  const eventsUsers = get(asyncEventsUsersAllAtom)
  const newEventsUser = eventsUsers.filter(
    (eventUser) => !(eventUser.eventId === eventId && eventUser.userId === userId)
  )

  set(asyncEventsUsersAllAtom, newEventsUser)
})

export default signOutUserSelector
