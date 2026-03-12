import Users from '@models/Users'
import Tariffs from '@models/Tariffs'

const normalizeEmail = (value) => {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

const buildPatch = (user, profile) => {
  const patch = {}
  if (!user.vkId && profile.vkId) patch.vkId = profile.vkId
  if (profile.email && !user.email) patch.email = profile.email
  if (profile.firstName && !user.firstName) patch.firstName = profile.firstName
  if (profile.secondName && !user.secondName)
    patch.secondName = profile.secondName
  if (
    profile.image &&
    (!Array.isArray(user.images) || user.images.length === 0)
  ) {
    patch.images = [profile.image]
  }
  if (!user.registrationType) patch.registrationType = 'vk'
  return patch
}

export const ensureVkUser = async ({
  vkId = '',
  email = '',
  firstName = '',
  secondName = '',
  image = '',
}) => {
  const normalizedVkId = String(vkId || '').trim()
  if (!normalizedVkId) return null
  const normalizedEmail = normalizeEmail(email)

  let user = await Users.findOne({ vkId: normalizedVkId })
  if (!user && normalizedEmail) {
    user = await Users.findOne({ email: normalizedEmail })
  }

  if (!user) {
    const cheapestTariff = await Tariffs.findOne({
      hidden: { $ne: true },
    })
      .sort({ price: 1, title: 1 })
      .lean()

    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    try {
      user = await Users.create({
        vkId: normalizedVkId,
        email: normalizedEmail,
        // Временное уникальное значение, чтобы не словить E11000 на sparse phone index.
        // Сразу после создания поле удаляется.
        phone: `vkid_${normalizedVkId}`,
        firstName,
        secondName,
        images: image ? [image] : [],
        registrationType: 'vk',
        role: 'user',
        tenantId: null,
        tariffId: cheapestTariff?._id ?? null,
        trialActivatedAt: now,
        trialEndsAt,
        trialUsed: true,
        consentPrivacyPolicyAccepted: true,
        consentPersonalDataAccepted: true,
        privacyPolicyAcceptedAt: now,
        personalDataProcessingAcceptedAt: now,
      })
    } catch (error) {
      if (error?.code === 11000) {
        const conflictByVk = await Users.findOne({ vkId: normalizedVkId })
        if (conflictByVk) {
          user = conflictByVk
        } else if (normalizedEmail) {
          const conflictByEmail = await Users.findOne({ email: normalizedEmail })
          if (conflictByEmail) {
            user = conflictByEmail
          } else {
            throw error
          }
        } else {
          throw error
        }
      } else {
        throw error
      }
    }

    if (user?.phone && String(user.phone).startsWith('vkid_')) {
      user = await Users.findByIdAndUpdate(
        user._id,
        { $unset: { phone: 1 } },
        { new: true }
      )
    }
  } else {
    const patch = buildPatch(user, {
      vkId: normalizedVkId,
      email: normalizedEmail,
      firstName,
      secondName,
      image,
    })

    if (Object.keys(patch).length > 0) {
      user = await Users.findByIdAndUpdate(
        user._id,
        { $set: patch },
        { new: true }
      )
    }
  }

  if (!user.tenantId) {
    user = await Users.findByIdAndUpdate(
      user._id,
      { $set: { tenantId: user._id } },
      { new: true }
    )
  }

  return user
}
