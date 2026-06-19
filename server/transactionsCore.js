export const normalizeOptionalRelationId = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

export const getOptionalRelationUpdateValue = ({
  body = {},
  existing = {},
  field,
}) => {
  if (Object.hasOwn(body, field)) {
    return normalizeOptionalRelationId(body[field])
  }
  return normalizeOptionalRelationId(existing[field])
}
