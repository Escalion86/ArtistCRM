import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

const isLoadedAtom = atomFamily(() => atom(false))

export default isLoadedAtom
