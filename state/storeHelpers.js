import store from './store'

export const getAtomValue = (atom) => store.get(atom)

export const setAtomValue = (atom, value) => store.set(atom, value)

export default store
