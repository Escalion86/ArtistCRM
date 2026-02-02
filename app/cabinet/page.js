import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import fetchProps from '@server/fetchProps'
import authOptions from '../api/auth/[...nextauth]/_options'

export const dynamic = 'force-dynamic'

export default async function Cabinet() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    console.error('Ошибка получения сессии в /cabinet', error)
  }

  if (!session) return redirect('/login')

  const fetchedProps = await fetchProps(session?.user)
  return redirect('/cabinet/eventsUpcoming')
}
