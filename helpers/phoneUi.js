export const formatPhoneWithPlus = (value) => {
  const phone = String(value ?? '').trim()
  if (!phone) return ''
  return phone.startsWith('+') ? phone : `+${phone}`
}

export const getPhoneDigits = (value) =>
  String(value ?? '').replace(/[^\d]/g, '')

export const getInitialClientPhone = (value) => {
  const digits = getPhoneDigits(value)

  if (digits.length === 10) return Number(`7${digits}`)
  if (digits.length !== 11) return null
  if (digits.startsWith('8')) return Number(`7${digits.slice(1)}`)
  if (digits.startsWith('7')) return Number(digits)

  return null
}
