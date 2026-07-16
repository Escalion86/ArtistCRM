import Events from '@models/Events'
import Services from '@models/Services'
import SiteSettings from '@models/SiteSettings'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  buildDemoEventPayload,
  getOnboardingPreset,
  getStarterServicesForPreset,
  ONBOARDING_ACTIVITY_PRESETS,
} from '@helpers/onboardingPresets.mjs'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import { sanitizeMobileUser } from '@server/mobile/sessions'
import { sanitizeMobileSettings } from '@server/mobile/settings'

const allowedPresets = new Set(
  ONBOARDING_ACTIVITY_PRESETS.map((preset) => preset.key)
)

const publicPresets = ONBOARDING_ACTIVITY_PRESETS.map((preset) => ({
  key: preset.key,
  title: preset.title,
  shortTitle: preset.shortTitle,
  description: preset.description,
  starterServices: preset.starterServices,
}))

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  await dbConnect()
  const [settings, servicesCount] = await Promise.all([
    SiteSettings.findOne({ tenantId: context.tenantId }).lean(),
    Services.countDocuments({ tenantId: context.tenantId }),
  ])
  return mobileSuccess({
    completed: settings?.custom?.firstRunWizardCompleted === true,
    settings: sanitizeMobileSettings(settings),
    servicesCount,
    presets: publicPresets,
  })
}

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const body = await req.json().catch(() => ({}))
  const firstName = String(body?.profile?.firstName || '').trim()
  const secondName = String(body?.profile?.secondName || '').trim()
  if (!firstName || !secondName) {
    return mobileError(
      'PROFILE_REQUIRED',
      'Укажите имя и фамилию',
      400,
      !firstName ? 'firstName' : 'secondName'
    )
  }
  const presetKey = allowedPresets.has(body?.presetKey)
    ? body.presetKey
    : 'other'
  const town = String(body?.town || '').trim()
  const timeZone = String(body?.timeZone || 'Asia/Krasnoyarsk').trim()
  const now = new Date()

  await dbConnect()
  const user = await Users.findOneAndUpdate(
    { _id: context.user._id, tenantId: context.tenantId },
    {
      $set: {
        firstName,
        secondName,
        thirdName: String(body?.profile?.thirdName || '').trim(),
        whatsapp: body?.profile?.whatsapp || null,
        telegram: String(body?.profile?.telegram || '').trim(),
        vk: String(body?.profile?.vk || '').trim(),
        instagram: String(body?.profile?.instagram || '').trim(),
      },
    },
    { returnDocument: 'after', runValidators: true }
  )
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)

  const existingSettings = await SiteSettings.findOne({
    tenantId: context.tenantId,
  }).lean()
  const custom = {
    ...(existingSettings?.custom || {}),
    firstRunWizardCompleted: true,
    firstRunWizardCompletedAt: now.toISOString(),
    onboardingActivityPreset: presetKey,
    onboardingStarterServicesCreated: Boolean(body?.createStarterServices),
    onboardingStarterServicesManual: !body?.createStarterServices,
    showColleagueTransferFields: Boolean(body?.showColleagueTransferFields),
    timeZoneConfirmed: true,
    mobileTheme: body?.theme === 'dark' ? 'dark' : 'light',
  }
  const settings = await SiteSettings.findOneAndUpdate(
    { tenantId: context.tenantId },
    {
      $set: {
        tenantId: context.tenantId,
        defaultTown: town,
        towns: town
          ? Array.from(new Set([...(existingSettings?.towns || []), town]))
          : existingSettings?.towns || [],
        timeZone,
        custom,
      },
      $inc: { syncVersion: 1 },
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  )

  let createdServices = []
  if (body?.createStarterServices) {
    const servicesCount = await Services.countDocuments({
      tenantId: context.tenantId,
    })
    if (servicesCount === 0) {
      createdServices = await Services.insertMany(
        getStarterServicesForPreset(presetKey).map((service) => ({
          ...service,
          tenantId: context.tenantId,
        }))
      )
    }
  }

  let demoEvent = null
  if (body?.createDemoEvent) {
    const existingDemo = await Events.findOne({
      tenantId: context.tenantId,
      isDemo: true,
    })
    if (!existingDemo) {
      const preset = getOnboardingPreset(presetKey)
      demoEvent = await Events.create({
        ...buildDemoEventPayload(
          preset.key,
          createdServices.map((service) => service._id)
        ),
        tenantId: context.tenantId,
        isDemo: true,
      })
    }
  }

  return mobileSuccess({
    user: sanitizeMobileUser(user),
    settings: sanitizeMobileSettings(settings),
    services: createdServices,
    event: demoEvent,
  })
}
