export const applyConflictChoiceToPatch = ({
  payload,
  baseValues,
  path,
  local,
  remote,
  choice,
}: {
  payload: Record<string, unknown>
  baseValues: Record<string, unknown>
  path: string
  local: unknown
  remote: unknown
  choice: 'local' | 'remote'
}) => {
  const nextPayload = { ...payload }
  const nextBaseValues = { ...baseValues }

  if (choice === 'local') {
    nextPayload[path] = local
    nextBaseValues[path] = remote
  } else {
    delete nextPayload[path]
    delete nextBaseValues[path]
  }

  return { payload: nextPayload, baseValues: nextBaseValues }
}
