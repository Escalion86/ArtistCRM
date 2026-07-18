const nationalDigits = (value: string) => {
  const source = String(value || '')
  const digits = source.replace(/\D/g, '')
  if (!digits) return ''

  if (source.trimStart().startsWith('+7')) return digits.slice(1, 11)

  if (digits.length > 10 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1, 11)
  }

  return digits.slice(0, 10)
}

export const formatRussianPhone = (value: string) => {
  const sourceDigits = String(value || '').replace(/\D/g, '')
  if (!String(value || '').trimStart().startsWith('+7') && (sourceDigits === '7' || sourceDigits === '8')) {
    return '+7 '
  }

  const digits = nationalDigits(value)
  if (!digits) return ''

  const parts = ['+7']
  parts.push(` (${digits.slice(0, 3)}`)
  if (digits.length >= 3) parts.push(')')
  if (digits.length > 3) parts.push(` ${digits.slice(3, 6)}`)
  if (digits.length > 6) parts.push(`-${digits.slice(6, 8)}`)
  if (digits.length > 8) parts.push(`-${digits.slice(8, 10)}`)
  return parts.join('')
}

export const normalizeRussianPhone = (value: string) => {
  const digits = nationalDigits(value)
  return digits.length === 10 ? `7${digits}` : ''
}

export const formatPhoneForDisplay = (
  value: string | number | null | undefined
) => {
  const source = String(value ?? '').trim()
  if (!source || source.startsWith('+')) return source

  const digits = source.replace(/\D/g, '')
  if (digits.length === 10) return `+7${digits}`
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`
  if (digits.length === 11 && digits.startsWith('7')) {
    return source.startsWith('7') ? `+${source}` : `+${digits}`
  }

  return source
}
