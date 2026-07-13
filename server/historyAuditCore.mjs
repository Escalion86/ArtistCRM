const getSafeHistoryErrorMeta = (error) => ({
  name: typeof error?.name === 'string' ? error.name : 'Error',
  code:
    typeof error?.code === 'string' || typeof error?.code === 'number'
      ? error.code
      : undefined,
})

const writeHistorySafely = async ({
  create,
  entry,
  context = '',
  logError = console.error,
}) => {
  try {
    return await create(entry)
  } catch (error) {
    logError('History audit write failed', {
      context,
      schema: entry?.schema,
      action: entry?.action,
      error: getSafeHistoryErrorMeta(error),
    })
    return null
  }
}

export { getSafeHistoryErrorMeta, writeHistorySafely }
