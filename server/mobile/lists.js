export const normalizeMobileStringList = (items, { limit = 100, maxLength = 100 } = {}) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const result = []
  for (const item of items) {
    const value = typeof item === 'string' ? item.trim().slice(0, maxLength) : ''
    const key = value.toLocaleLowerCase('ru')
    if (!value || seen.has(key)) continue
    seen.add(key)
    result.push(value)
    if (result.length >= limit) break
  }
  return result.sort((a, b) => a.localeCompare(b, 'ru'))
}
