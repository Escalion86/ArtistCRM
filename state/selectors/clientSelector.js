import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import clientsAtom from '@state/atoms/clientsAtom'

const clientSelector = atomFamily((id) =>
  atom((get) => {
    if (!id) return null
    return get(clientsAtom).find((item) => item._id === id)
  })
)

export default clientSelector
