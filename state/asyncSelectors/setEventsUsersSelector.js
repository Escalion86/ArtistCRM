import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import asyncEventsUsersAllAtom from './asyncEventsUsersAllAtom'
import asyncEventsUsersByEventIdAtom from './asyncEventsUsersByEventIdAtom'
import asyncEventsUsersByUserIdAtom from './asyncEventsUsersByUserIdAtom'

const setEventsUsersSelector = atomFamily((eventId) =>
  atom(null, (get, set, newEventsUsers = []) => {
    const isLoadedEventId = get(isLoadedAtom('asyncEventsUsersByEventIdAtom' + eventId))
    if (!isLoadedEventId) return

    const oldEventUsers = get(asyncEventsUsersByEventIdAtom(eventId))
    set(asyncEventsUsersByEventIdAtom(eventId), newEventsUsers)

    for (const oldEventUser of oldEventUsers) {
      const isLoadedUserId = get(
        isLoadedAtom('asyncEventsUsersByUserIdAtom' + oldEventUser.userId)
      )
      if (!isLoadedUserId) continue
      const eventsUser = get(asyncEventsUsersByUserIdAtom(oldEventUser.userId))
      const newEventsUser = eventsUser.filter((eventUser) => eventUser.eventId !== eventId)
      set(asyncEventsUsersByUserIdAtom(oldEventUser.userId), newEventsUser)
    }

    for (const newEventUser of newEventsUsers) {
      const isLoadedUserId = get(
        isLoadedAtom('asyncEventsUsersByUserIdAtom' + newEventUser.userId)
      )
      if (!isLoadedUserId) continue
      const eventsUser = get(asyncEventsUsersByUserIdAtom(newEventUser.userId))
      set(asyncEventsUsersByUserIdAtom(newEventUser.userId), [
        ...eventsUser,
        newEventUser,
      ])
    }

    const isLoadedEventsUsersAll = get(isLoadedAtom('asyncEventsUsersAllAtom'))
    if (!isLoadedEventsUsersAll) return

    const eventsUsers = get(asyncEventsUsersAllAtom)
    const oldEventUsersIds = oldEventUsers.map(({ _id }) => _id)
    const cleanedEventsUsers = eventsUsers.filter(
      ({ _id }) => !oldEventUsersIds.includes(_id)
    )
    const updatedEventsUsers = [...cleanedEventsUsers, ...newEventsUsers]

    set(asyncEventsUsersAllAtom, updatedEventsUsers)
  })
)

export default setEventsUsersSelector
