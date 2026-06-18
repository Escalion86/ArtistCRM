import { atomFamily } from 'jotai-family'
import serviceGroupsAtom from '@state/atoms/serviceGroupsAtom'

const serviceGroupSelector = atomFamily((id) =>
  atom((get) => {
    if (!id) return null
    return get(serviceGroupsAtom).find((item) => item._id === id)
  })
)

export default serviceGroupSelector
