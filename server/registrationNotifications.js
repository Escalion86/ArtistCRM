import Users from '@models/Users'
import { sendMultiChannelPushToTenant } from '@server/multiChannelPush'
import { buildNewUserRegistrationPush } from './registrationNotificationCore.js'

export { buildNewUserRegistrationPush } from './registrationNotificationCore.js'

export const notifyDevelopersAboutNewUser = async (user) => {
  if (!user?._id) return { notified: 0 }

  try {
    const developers = await Users.find({
      role: 'dev',
      archive: { $ne: true },
    })
      .select('_id tenantId')
      .lean()
    const tenantIds = [
      ...new Set(
        developers
          .map((developer) => String(developer.tenantId || developer._id))
          .filter(Boolean)
      ),
    ]
    const payload = buildNewUserRegistrationPush(user)

    await Promise.all(
      tenantIds.map((tenantId) =>
        sendMultiChannelPushToTenant({
          tenantId,
          payload,
          source: 'registration',
        })
      )
    )

    return { notified: tenantIds.length }
  } catch (error) {
    console.warn('new user registration push failed', {
      userId: String(user._id),
      error: error?.message,
    })
    return { notified: 0 }
  }
}
