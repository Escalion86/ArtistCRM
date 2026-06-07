import getPersonFullName from './getPersonFullName.js'

const hasText = (value) => String(value ?? '').trim().length > 0

export const hasContractClientRequisites = (client) => {
  if (!client) return false
  const hasName = hasText(client.legalName) || hasText(getPersonFullName(client))
  return Boolean(
    hasName &&
      hasText(client.inn) &&
      hasText(client.bankName) &&
      hasText(client.bik) &&
      hasText(client.checkingAccount) &&
      hasText(client.correspondentAccount) &&
      hasText(client.legalAddress)
  )
}

export const buildContractClientCandidates = ({
  clients = [],
  eventClientId = null,
  otherContacts = [],
} = {}) => {
  const clientsById = new Map(
    (Array.isArray(clients) ? clients : [])
      .filter((client) => client?._id)
      .map((client) => [String(client._id), client])
  )
  const result = []
  const seen = new Set()

  const addCandidate = ({ clientId, source, comment = '' }) => {
    const key = String(clientId || '')
    if (!key || seen.has(key)) return
    const client = clientsById.get(key)
    if (!hasContractClientRequisites(client)) return
    seen.add(key)
    result.push({ client, source, comment })
  }

  addCandidate({ clientId: eventClientId, source: 'main' })

  ;(Array.isArray(otherContacts) ? otherContacts : []).forEach((contact) => {
    addCandidate({
      clientId: contact?.clientId,
      source: 'other',
      comment: typeof contact?.comment === 'string' ? contact.comment : '',
    })
  })

  return result
}

export const getContractClientCandidateLabel = (candidate) => {
  const client = candidate?.client
  const name = getPersonFullName(client, { fallback: 'Без имени' })
  const role =
    candidate?.source === 'main'
      ? 'клиент мероприятия'
      : candidate?.comment || 'доп. контакт'
  const legalName = String(client?.legalName || '').trim()
  return [name, legalName, role].filter(Boolean).join(' · ')
}
