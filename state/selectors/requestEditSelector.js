import { atom } from 'jotai'
import { DEFAULT_REQUEST } from '@helpers/constants'
import requestsAtom from '@state/atoms/requestsAtom'

const requestEditSelector = atom(
  () => DEFAULT_REQUEST,
  (get, set, newItem) => {
    const items = get(requestsAtom)
    if (!newItem?._id) return
    const findedItem = items.find((event) => event._id === newItem._id)
    if (findedItem) {
      const newItemsList = items.map((event) => {
        if (event._id === newItem._id) return newItem
        return event
      })
      set(requestsAtom, newItemsList)
    } else {
      set(requestsAtom, [...items, newItem])
    }
  }
)

export default requestEditSelector
