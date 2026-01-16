import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import { DEFAULT_REQUEST } from '@helpers/constants'
import requestsAtom from '@state/atoms/requestsAtom'

export const requestSelector = atomFamily((id) =>
  atom((get) => {
    if (!id) return DEFAULT_REQUEST
    return get(requestsAtom).find((item) => item._id === id)
  })
)

export default requestSelector
