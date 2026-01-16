// import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
// import CabinetPage from './cabinet'

export default async function Cabinet() {
  return redirect('/cabinet/requests')
}
