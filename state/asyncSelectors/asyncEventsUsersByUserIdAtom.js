import { atom } from 'jotai'
import { atomFamily, atomWithDefault } from 'jotai/utils'
import { getData } from '@helpers/CRUD'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import { setAtomValue } from '@state/storeHelpers'

const asyncEventsUsersByUserIdSelector = atomFamily((userId) =>
  atom(async () => {
    if (!userId) return undefined
    const res = await getData('/api/eventsusers', { userId }, null, null, false)
    setAtomValue(isLoadedAtom('asyncEventsUsersByUserIdAtom' + userId), true)
    return res
  })
)

const asyncEventsUsersByUserIdAtom = atomFamily((userId) =>
  atomWithDefault((get) => get(asyncEventsUsersByUserIdSelector(userId)))
)

export default asyncEventsUsersByUserIdAtom
