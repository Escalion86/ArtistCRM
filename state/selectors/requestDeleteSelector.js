import { atom } from 'jotai'
import { DEFAULT_REQUEST } from '@helpers/constants'
import requestsAtom from '@state/atoms/requestsAtom'

const requestDeleteSelector = atom(
  () => DEFAULT_REQUEST,
  (get, set, itemId) => {
    const items = get(requestsAtom)
    const newItemsList = items.filter((item) => item._id !== itemId)
    set(requestsAtom, newItemsList)
  }
)

export default requestDeleteSelector
