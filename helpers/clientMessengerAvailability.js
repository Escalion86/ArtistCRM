const hasOwn = (value, key) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value, key)

const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '')

const normalizeTelegram = (value) =>
  String(value ?? '').trim().replace(/^@+/, '').toLowerCase()

export const resetClientMessengerAvailability = (
  existingClient,
  updatePayload
) => {
  const update =
    updatePayload && typeof updatePayload === 'object' && !Array.isArray(updatePayload)
      ? { ...updatePayload }
      : {}
  const phoneChanged =
    hasOwn(update, 'phone') &&
    normalizePhone(update.phone) !== normalizePhone(existingClient?.phone)
  const telegramChanged =
    hasOwn(update, 'telegram') &&
    normalizeTelegram(update.telegram) !==
      normalizeTelegram(existingClient?.telegram)

  if (phoneChanged) update.telegramPhone = null
  if (phoneChanged || telegramChanged) {
    update.telegramPhoneUnavailable = false
  }

  return update
}
