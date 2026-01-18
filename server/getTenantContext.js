import { getServerSession } from 'next-auth'
import authOptions from '../app/api/auth/[...nextauth]/_options'
import dbConnect from './dbConnect'
import Users from '@models/Users'

const getTenantContext = async () => {
  const session = await getServerSession(authOptions)
  let user = session?.user ?? null

  if (user?._id) {
    try {
      await dbConnect()
      const dbUser = await Users.findById(user._id).lean()
      if (dbUser) {
        const { password, ...safeUser } = dbUser
        user = { ...user, ...safeUser }
      }
    } catch (error) {
      console.error('getTenantContext: не удалось загрузить пользователя', error)
    }
  }

  const tenantId = user?.tenantId || user?._id || null

  return { session, user, tenantId }
}

export default getTenantContext
