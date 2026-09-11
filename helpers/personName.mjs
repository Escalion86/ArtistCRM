export const buildSingleNamePatch = (fullName) => ({
  firstName: String(fullName ?? '').trim(),
  secondName: '',
  thirdName: '',
})
