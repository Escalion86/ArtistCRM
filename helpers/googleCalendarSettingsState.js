export const shouldSaveGoogleCalendarSettingsBeforeSync = ({
  remindersChanged,
  statusColorsChanged,
  syncSettingsChanged,
} = {}) =>
  Boolean(remindersChanged || statusColorsChanged || syncSettingsChanged)
