import { atomWithDefault } from 'jotai/utils'
import asyncEventsUsersAllSelector from './asyncEventsUsersAllSelector'

const asyncEventsUsersAllAtom = atomWithDefault((get) =>
  get(asyncEventsUsersAllSelector)
)

export default asyncEventsUsersAllAtom
