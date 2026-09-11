import { atom } from 'jotai'
import newsAtom from '@state/atoms/newsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { filterUnreadNews } from '@helpers/whatsNew.mjs'

const unreadNewsSelector = atom((get) =>
  filterUnreadNews(get(newsAtom), get(loggedUserAtom)?.lastSeenNewsAt)
)

export default unreadNewsSelector
