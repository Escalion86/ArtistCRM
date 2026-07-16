const fields = Object.freeze({
  artistFullName: ['contractArtistFullName', 200],
  artistName: ['contractArtistName', 200],
  artistOgrnip: ['contractArtistOgrnip', 15],
  artistInn: ['contractArtistInn', 12],
  artistBankName: ['contractArtistBankName', 200],
  artistBik: ['contractArtistBik', 9],
  artistCheckingAccount: ['contractArtistCheckingAccount', 20],
  artistCorrespondentAccount: ['contractArtistCorrespondentAccount', 20],
  artistLegalAddress: ['contractArtistLegalAddress', 500],
})

const readCustom = (custom, key) =>
  typeof custom?.get === 'function' ? custom.get(key) : custom?.[key]

const normalizeText = (value, maxLength) =>
  String(value ?? '').trim().slice(0, maxLength)

const normalizeDigits = (value, maxLength) =>
  String(value ?? '').replace(/\D/g, '').slice(0, maxLength)

export const serializeMobileArtistRequisites = (custom = {}) => {
  const result = {
    artistStatus: readCustom(custom, 'contractArtistStatus') === 'self_employed'
      ? 'self_employed'
      : 'individual_entrepreneur',
  }
  for (const [mobileKey, [storageKey, maxLength]] of Object.entries(fields)) {
    const value = readCustom(custom, storageKey)
    result[mobileKey] = [
      'artistOgrnip',
      'artistInn',
      'artistBik',
      'artistCheckingAccount',
      'artistCorrespondentAccount',
    ].includes(mobileKey)
      ? normalizeDigits(value, maxLength)
      : normalizeText(value, maxLength)
  }
  if (result.artistStatus === 'self_employed') result.artistOgrnip = ''
  return result
}

export const normalizeMobileArtistRequisites = (body = {}, current = {}) => {
  const merged = { ...serializeMobileArtistRequisites(current) }
  if (body.artistStatus !== undefined) {
    merged.artistStatus = body.artistStatus === 'self_employed'
      ? 'self_employed'
      : 'individual_entrepreneur'
  }
  for (const [mobileKey, [, maxLength]] of Object.entries(fields)) {
    if (body[mobileKey] === undefined) continue
    merged[mobileKey] = [
      'artistOgrnip',
      'artistInn',
      'artistBik',
      'artistCheckingAccount',
      'artistCorrespondentAccount',
    ].includes(mobileKey)
      ? normalizeDigits(body[mobileKey], maxLength)
      : normalizeText(body[mobileKey], maxLength)
  }
  if (merged.artistStatus === 'self_employed') merged.artistOgrnip = ''
  return merged
}

export const buildArtistRequisitesUpdate = (requisites) => {
  const update = {
    'custom.contractArtistStatus': requisites.artistStatus,
  }
  for (const [mobileKey, [storageKey]] of Object.entries(fields)) {
    update[`custom.${storageKey}`] = requisites[mobileKey] || ''
  }
  return update
}
