import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import fetchProps from '@server/fetchProps'
import authOptions from '../api/auth/[...nextauth]/_options'

export default async function Cabinet() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    console.error('Ошибка получения сессии в /cabinet', error)
  }

  if (!session) return redirect('/login')

  const fetchedProps = await fetchProps(session?.user)
  const requestsCount = Array.isArray(fetchedProps?.requests)
    ? fetchedProps.requests.length
    : 0

  if (requestsCount === 0) {
    return redirect('/cabinet/eventsUpcoming')
  }

  return redirect('/cabinet/requests')
}
