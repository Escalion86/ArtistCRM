import getPersonFullName from './getPersonFullName.js'

export const getEventTransferDisplay = (event, clients = []) => {
  if (!event?.isTransferred) {
    return {
      isTransferred: false,
      colleague: null,
      colleagueName: '',
      missingColleague: false,
    }
  }

  const colleagueId = event?.colleagueId ? String(event.colleagueId) : ''
  const colleague =
    clients.find((client) => String(client?._id) === colleagueId) ?? null
  const colleagueName = colleague
    ? getPersonFullName(colleague, { fallback: colleague._id })
    : ''

  return {
    isTransferred: true,
    colleague,
    colleagueName,
    missingColleague: !colleague,
  }
}
