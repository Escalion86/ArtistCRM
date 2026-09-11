export const FIRST_RUN_WIZARD_COMPLETED_KEY = 'firstRunWizardCompleted'
export const FIRST_RUN_WIZARD_SHOW_TOKEN_KEY = 'firstRunWizardShowToken'
export const FIRST_RUN_STEP_KEY = 'firstRunWizardStep'
export const FIRST_RUN_TOUR_KEY = 'firstRunTourResult'
export const FIRST_RUN_STEPS = [
  'profile',
  'environment',
  'specialization',
  'services',
]

export const getFirstRunStepIndex = (custom = {}) => {
  if (getCustomValue(custom, FIRST_RUN_WIZARD_COMPLETED_KEY) === true) return 0
  return Math.max(
    0,
    FIRST_RUN_STEPS.indexOf(getCustomValue(custom, FIRST_RUN_STEP_KEY))
  )
}
export const SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY = 'showColleagueTransferFields'

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

export const shouldOpenFirstRunWizard = ({
  loggedUser,
  siteSettings,
  alreadyShown = false,
} = {}) => {
  if (!loggedUser?._id || alreadyShown) return false
  if (loggedUser?.impersonation?.active) return false
  const custom = siteSettings?.custom ?? {}
  const manualToken = getCustomValue(custom, FIRST_RUN_WIZARD_SHOW_TOKEN_KEY)
  if (manualToken) return true
  return getCustomValue(custom, FIRST_RUN_WIZARD_COMPLETED_KEY) !== true
}

export const buildFirstRunCompletionCustomPatch = ({ existing = {} } = {}) => ({
  ...(existing ?? {}),
  [FIRST_RUN_WIZARD_COMPLETED_KEY]: true,
  [FIRST_RUN_WIZARD_SHOW_TOKEN_KEY]: null,
})

export const shouldShowColleagueTransferControls = (siteSettings) =>
  getCustomValue(siteSettings?.custom, SHOW_COLLEAGUE_TRANSFER_FIELDS_KEY) ===
  true

export const getFirstRunStatusEducationItems = () => [
  {
    status: 'draft',
    title: 'Заявка',
    description:
      'Клиент проявил интерес, но заказ еще не подтвержден. Главная задача: поставить следующий контакт.',
  },
  {
    status: 'active',
    title: 'Подтверждено',
    description:
      'Клиент подтвердил заказ, дату или условия. Теперь карточку нужно вести по оплатам, задачам, документам и календарю.',
  },
  {
    status: 'canceled',
    title: 'Отменено',
    description: 'Заказ не состоялся и не должен считаться активной работой.',
  },
  {
    status: 'closed',
    title: 'Закрыто',
    description:
      'Работа завершена, оплаты и документы доведены до конца. Закрытая карточка больше не требует действий.',
  },
]
