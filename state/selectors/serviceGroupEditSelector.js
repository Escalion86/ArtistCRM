import { atom } from 'jotai'
import serviceGroupsAtom from '@state/atoms/serviceGroupsAtom'

const serviceGroupEditSelector = atom(
  () => [],
  (get, set, newItem) => {
    const items = get(serviceGroupsAtom)
    const exists = items.find(
      (serviceGroup) => serviceGroup._id === newItem._id
    )
    if (exists) {
      set(
        serviceGroupsAtom,
        items.map((serviceGroup) =>
          serviceGroup._id === newItem._id ? newItem : serviceGroup
        )
      )
    } else {
      set(serviceGroupsAtom, [...items, newItem])
    }
  }
)

export default serviceGroupEditSelector
