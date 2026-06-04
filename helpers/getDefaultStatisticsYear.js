export const getDefaultStatisticsYear = (
  availableYears,
  { currentYear = new Date().getFullYear() } = {}
) => {
  if (!Array.isArray(availableYears) || availableYears.length === 0) return null
  if (availableYears.includes(currentYear)) return currentYear
  return availableYears[0]
}
