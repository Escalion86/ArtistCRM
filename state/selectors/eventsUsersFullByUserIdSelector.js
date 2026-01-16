import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import eventSelector from './eventSelector'
import userSelector from './userSelector'
import asyncEventsUsersByUserIdAtom from '@state/asyncSelectors/asyncEventsUsersByUserIdAtom'

export const eventsUsersFullByUserIdSelector = atomFamily((id) =>
  atom(async (get) => {
    if (!id) return []

    const eventsUsers = await get(asyncEventsUsersByUserIdAtom(id))

    return eventsUsers
      ? eventsUsers.map((item) => {
          const user = get(userSelector(item.userId))
          const event = get(eventSelector(item.eventId))
          return {
            ...item,
            user,
            event,
          }
        })
      : []
  })
)

export default eventsUsersFullByUserIdSelector
