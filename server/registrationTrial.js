import SiteSettings from '@models/SiteSettings'
import Tariffs from '@models/Tariffs'
import {
  getTariffFeatureKeys,
  getTariffFeatureLabels,
} from '@helpers/tariffFeatures'

export const DEFAULT_REGISTRATION_TRIAL_DAYS = 14

const addDays = (date, days) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

const formatDate = (date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)

export const renderRegistrationWelcome = (
  template,
  { tariffTitle, endsAt, durationDays, featureLabels }
) => {
  const functions =
    featureLabels.length > 0
      ? featureLabels.join(', ')
      : 'возможности тарифа'
  return String(template || '')
    .replaceAll('{tariff}', tariffTitle)
    .replaceAll('{date}', formatDate(endsAt))
    .replaceAll('{days}', String(durationDays))
    .replaceAll('{functions}', functions)
    .trim()
}

export const getRegistrationTrialSettings = async () => {
  const settings = await SiteSettings.findOne({ tenantId: null })
    .select('registrationTrial')
    .lean()
  const configured = Boolean(settings?.registrationTrial)
  const raw = settings?.registrationTrial ?? {}
  const durationDays = Math.min(
    365,
    Math.max(1, Number(raw.durationDays) || DEFAULT_REGISTRATION_TRIAL_DAYS)
  )
  const tariff = raw.tariffId
    ? await Tariffs.findById(raw.tariffId).lean()
    : await Tariffs.findOne({ hidden: { $ne: true } })
        .sort({ price: 1, title: 1 })
        .lean()

  return {
    configured,
    enabled: configured ? raw.enabled === true : false,
    tariff,
    durationDays,
    welcomeMessage: String(raw.welcomeMessage || '').trim(),
  }
}

export const buildRegistrationTrialUserFields = async (now = new Date()) => {
  const settings = await getRegistrationTrialSettings()
  const tariffId = settings.tariff?._id ?? null

  if (!settings.enabled || !tariffId) {
    return {
      tariffId,
      trialActivatedAt: null,
      trialEndsAt: null,
      trialUsed: false,
      registrationOffer: null,
    }
  }

  const endsAt = addDays(now, settings.durationDays)
  if (!settings.configured) {
    return {
      tariffId,
      trialActivatedAt: now,
      trialEndsAt: endsAt,
      trialUsed: true,
      registrationOffer: null,
    }
  }

  const featureKeys = getTariffFeatureKeys(settings.tariff)
  const featureLabels = getTariffFeatureLabels(settings.tariff)
  const welcomeMessage = renderRegistrationWelcome(settings.welcomeMessage, {
    tariffTitle: settings.tariff.title,
    endsAt,
    durationDays: settings.durationDays,
    featureLabels,
  })

  return {
    tariffId,
    trialActivatedAt: now,
    trialEndsAt: endsAt,
    trialUsed: true,
    tariffActiveUntil: endsAt,
    nextChargeAt: null,
    billingStatus: 'active',
    registrationOffer: {
      tariffId,
      tariffTitle: settings.tariff.title,
      startedAt: now,
      endsAt,
      welcomeMessage,
      featureKeys,
      featureLabels,
    },
  }
}
