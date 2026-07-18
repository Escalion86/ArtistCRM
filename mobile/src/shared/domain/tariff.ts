type TariffUser = {
  tariffId?: string | null
  tariffTitle?: string | null
}

export const getTariffDisplayName = (user?: TariffUser | null) => {
  const title = user?.tariffTitle?.trim()
  if (title) return title
  return user?.tariffId ? 'название уточняется' : 'не выбран'
}
