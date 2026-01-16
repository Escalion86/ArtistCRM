import { atom } from 'jotai'
import { atomFamily, atomWithDefault } from 'jotai/utils'
import { getData } from '@helpers/CRUD'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import { setAtomValue } from '@state/storeHelpers'

export const asyncEventsUsersByEventIdSelector = atomFamily((eventId) =>
  atom(async () => {
    if (!eventId) return undefined
    const res = await getData('/api/eventsusers', { eventId }, null, null, false)
    setAtomValue(isLoadedAtom('asyncEventsUsersByEventIdAtom' + eventId), true)
    return res
  })
)

const asyncEventsUsersByEventIdAtom = atomFamily((eventId) =>
  atomWithDefault((get) => get(asyncEventsUsersByEventIdSelector(eventId)))
)

export default asyncEventsUsersByEventIdAtom
