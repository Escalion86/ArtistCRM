import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import CabinetPage from './cabinet'
import fetchProps from '@server/fetchProps'
import authOptions from '../../api/auth/[...nextauth]/_options'

export const dynamic = 'force-dynamic'

export default async function Cabinet({ params, searchParams }) {
  let session = null

  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    console.error('Ошибка получения сессии в /cabinet/[page]', error)
  }

  const resolvedParams = await params

  const page =
    typeof resolvedParams?.page === 'string'
      ? resolvedParams.page
      : 'eventsUpcoming'
  if (page === 'requests') return redirect('/cabinet/eventsUpcoming')

  if (!session) return redirect('/login')

  const fetchedProps = await fetchProps(session?.user)

  return <CabinetPage {...fetchedProps} page={page} />
}
