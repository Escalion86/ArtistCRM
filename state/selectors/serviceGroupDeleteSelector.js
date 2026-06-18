import { atom } from 'jotai'
import serviceGroupsAtom from '@state/atoms/serviceGroupsAtom'

const serviceGroupDeleteSelector = atom(
  () => [],
  (get, set, itemId) => {
    const items = get(serviceGroupsAtom)
    const newItemsList = items.filter((item) => item._id !== itemId)
    set(serviceGroupsAtom, newItemsList)
  }
)

export default serviceGroupDeleteSelector
