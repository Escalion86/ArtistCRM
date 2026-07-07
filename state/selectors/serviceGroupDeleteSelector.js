import { atom } from 'jotai'
import serviceGroupsAtom from '@state/atoms/serviceGroupsAtom'
import servicesAtom from '@state/atoms/servicesAtom'
import { moveServicesFromGroupToUngrouped } from '@helpers/serviceGroups'

const serviceGroupDeleteSelector = atom(
  () => [],
  (get, set, itemId) => {
    const items = get(serviceGroupsAtom)
    const newItemsList = items.filter((item) => item._id !== itemId)
    set(serviceGroupsAtom, newItemsList)
    set(
      servicesAtom,
      moveServicesFromGroupToUngrouped(get(servicesAtom), itemId)
    )
  }
)

export default serviceGroupDeleteSelector
