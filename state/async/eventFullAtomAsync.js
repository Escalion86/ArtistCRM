import { atom } from 'jotai'
import { getData } from '@helpers/CRUD'
import { DEFAULT_EVENT } from '@helpers/constants'
import isLoadedAtom from '@state/atoms/isLoadedAtom'
import { atomWithDefault } from 'jotai/utils'
import { atomFamily } from 'jotai-family'

export const eventFullSelectorAsync = atomFamily((id) =>
  atom(async () => {
    if (!id) return DEFAULT_EVENT
    const res = await getData('/api/events/' + id, {}, null, null, false)

    return res
  })
)

const eventFullAtomAsync = atomFamily((id) =>
  atomWithDefault((get) => get(eventFullSelectorAsync(id)))
)

export default eventFullAtomAsync
