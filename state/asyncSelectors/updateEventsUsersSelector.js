import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import asyncEventsUsersAllAtom from './asyncEventsUsersAllAtom'
import asyncEventsUsersByEventIdAtom from './asyncEventsUsersByEventIdAtom'
import asyncEventsUsersByUserIdAtom from './asyncEventsUsersByUserIdAtom'

const updateEventsUsersSelector = atomFamily((eventId) =>
  atom(null, (get, set, updatedEventUsers = []) => {
    const isLoadedEventId = get(isLoadedAtom('asyncEventsUsersByEventIdAtom' + eventId))
    if (!isLoadedEventId) return

    const eventUsers = get(asyncEventsUsersByEventIdAtom(eventId))
    const newEventUsers = eventUsers.map((eventUser) => {
      const updatedEventUser = updatedEventUsers.find(({ _id }) => eventUser._id === _id)
      if (!updatedEventUser) return eventUser

      const isLoadedUserId = get(
        isLoadedAtom('asyncEventsUsersByUserIdAtom' + updatedEventUser.userId)
      )
      if (isLoadedUserId) {
        const eventsUser = get(asyncEventsUsersByUserIdAtom(updatedEventUser.userId))
        const updatedEventsUser = eventsUser.map((userEvent) =>
          userEvent._id === updatedEventUser._id ? updatedEventUser : userEvent
        )
        set(asyncEventsUsersByUserIdAtom(eventUser.userId), updatedEventsUser)
      }

      return updatedEventUser
    })

    set(asyncEventsUsersByEventIdAtom(eventId), newEventUsers)

    const isLoadedEventsUsersAll = get(isLoadedAtom('asyncEventsUsersAllAtom'))
    if (!isLoadedEventsUsersAll) return

    const eventsUsers = get(asyncEventsUsersAllAtom)
    const newEventUsersIds = newEventUsers.map(({ _id }) => _id)
    const cleanedEventsUsers = eventsUsers.filter(
      ({ _id }) => !newEventUsersIds.includes(_id)
    )
    const updatedEventsUsers = [...cleanedEventsUsers, ...newEventUsers]

    set(asyncEventsUsersAllAtom, updatedEventsUsers)
  })
)

export default updateEventsUsersSelector
