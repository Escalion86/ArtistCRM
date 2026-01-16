import { getServerSession } from 'next-auth'
import authOptions from '../app/api/auth/[...nextauth]/_options'

const getTenantContext = async () => {
  const session = await getServerSession(authOptions)
  const user = session?.user ?? null
  const tenantId = user?.tenantId || user?._id || null

  return { session, user, tenantId }
}

export default getTenantContext
