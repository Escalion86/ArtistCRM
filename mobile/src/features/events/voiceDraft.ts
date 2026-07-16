import { formatEventDateInput } from '../../shared/domain/eventForm'

export type VoiceDraftFields = {
  eventType?: unknown
  description?: unknown
  eventDate?: unknown
  dateEnd?: unknown
  contractSum?: unknown
  waitDeposit?: unknown
  depositExpectedAmount?: unknown
  clientId?: unknown
  clientName?: unknown
  address?: {
    town?: unknown
    street?: unknown
    house?: unknown
  } | null
}

export type VoiceDraftFormValues = {
  eventType: string
  description: string
  eventDate: string
  dateEnd: string
  clientId: string
  town: string
  street: string
  house: string
  contractSum: string
  waitDeposit: boolean
  depositExpectedAmount: string
}

const cleanText = (value: unknown, maxLength: number) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
)

const positiveAmount = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? String(Math.round(value))
    : ''
)

export const applyVoiceDraftFields = <T extends VoiceDraftFormValues>(
  current: T,
  draft: VoiceDraftFields,
  knownClientIds: Set<string>,
): T => {
  const next = { ...current }
  const eventType = cleanText(draft.eventType, 200)
  const description = cleanText(draft.description, 2000)
  const eventDate = typeof draft.eventDate === 'string' ? formatEventDateInput(draft.eventDate) : ''
  const dateEnd = typeof draft.dateEnd === 'string' ? formatEventDateInput(draft.dateEnd) : ''
  const contractSum = positiveAmount(draft.contractSum)
  const depositExpectedAmount = positiveAmount(draft.depositExpectedAmount)

  if (eventType) next.eventType = eventType
  if (description) next.description = description
  if (eventDate) next.eventDate = eventDate
  if (dateEnd) next.dateEnd = dateEnd
  if (contractSum) next.contractSum = contractSum
  if (typeof draft.waitDeposit === 'boolean') next.waitDeposit = draft.waitDeposit
  if (depositExpectedAmount) {
    next.depositExpectedAmount = depositExpectedAmount
    next.waitDeposit = true
  }
  if (typeof draft.clientId === 'string' && knownClientIds.has(draft.clientId)) {
    next.clientId = draft.clientId
  }
  if (draft.address && typeof draft.address === 'object') {
    const town = cleanText(draft.address.town, 200)
    const street = cleanText(draft.address.street, 200)
    const house = cleanText(draft.address.house, 100)
    if (town) next.town = town
    if (street) next.street = street
    if (house) next.house = house
  }
  return next
}

export const countApplicableVoiceDraftFields = (draft: VoiceDraftFields) => {
  let count = 0
  if (cleanText(draft.eventType, 200)) count += 1
  if (cleanText(draft.description, 2000)) count += 1
  if (typeof draft.eventDate === 'string' && formatEventDateInput(draft.eventDate)) count += 1
  if (typeof draft.dateEnd === 'string' && formatEventDateInput(draft.dateEnd)) count += 1
  if (positiveAmount(draft.contractSum)) count += 1
  if (typeof draft.waitDeposit === 'boolean') count += 1
  if (positiveAmount(draft.depositExpectedAmount)) count += 1
  if (typeof draft.clientId === 'string' && draft.clientId) count += 1
  if (draft.address && typeof draft.address === 'object') {
    if (cleanText(draft.address.town, 200)) count += 1
    if (cleanText(draft.address.street, 200)) count += 1
    if (cleanText(draft.address.house, 100)) count += 1
  }
  return count
}
