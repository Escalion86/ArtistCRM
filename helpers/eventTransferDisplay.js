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

const findClientById = (clients, clientId) => {
  if (!clientId) return null
  const normalizedId = String(clientId)
  return clients.find((client) => String(client?._id) === normalizedId) ?? null
}

export const getEventExtraContactDisplays = (event, clients = []) => {
  const mainClientId = event?.clientId ? String(event.clientId) : ''
  const usedClientIds = new Set(mainClientId ? [mainClientId] : [])
  const items = []

  const transferDisplay = getEventTransferDisplay(event, clients)
  if (transferDisplay.colleague?._id) {
    const colleagueId = String(transferDisplay.colleague._id)
    if (!usedClientIds.has(colleagueId)) {
      usedClientIds.add(colleagueId)
      items.push({
        key: `transferred-${colleagueId}`,
        type: 'transferred',
        label: `Передано: ${transferDisplay.colleagueName}`,
        comment: '',
        client: transferDisplay.colleague,
      })
    }
  }

  const otherContacts = Array.isArray(event?.otherContacts)
    ? event.otherContacts
    : []
  otherContacts.forEach((contact) => {
    const client = findClientById(clients, contact?.clientId)
    if (!client?._id) return

    const clientId = String(client._id)
    if (usedClientIds.has(clientId)) return
    usedClientIds.add(clientId)

    items.push({
      key: `other-${clientId}`,
      type: 'other',
      label: getPersonFullName(client, { fallback: client._id }),
      comment: typeof contact?.comment === 'string' ? contact.comment : '',
      client,
    })
  })

  return items
}
