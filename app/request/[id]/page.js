import { redirect } from 'next/navigation'
import Requests from '@models/Requests'
import dbConnect from '@server/dbConnect'
import RequestRedirectClient from './RequestRedirectClient'

export const runtime = 'nodejs'

export default async function RequestRedirectPage({ params }) {
  const { id } = params ?? {}
  if (!id) return redirect('/cabinet/requests')
  await dbConnect()
  const request = await Requests.findById(id).select('_id').lean()
  if (!request) return redirect('/cabinet/requests')
  return <RequestRedirectClient id={id} />
}
