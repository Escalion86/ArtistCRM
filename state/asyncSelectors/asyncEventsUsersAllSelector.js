import { atom } from 'jotai'
import { getData } from '@helpers/CRUD'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import { setAtomValue } from '@state/storeHelpers'

export const asyncEventsUsersAllSelector = atom(async () => {
  const res = await getData('/api/eventsusers', null, null, null, false)
  setAtomValue(isLoadedAtom('asyncEventsUsersAllAtom'), true)

  return res
})

export default asyncEventsUsersAllSelector
