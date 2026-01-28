import { redirect } from 'next/navigation'
import Events from '@models/Events'
import dbConnect from '@server/dbConnect'

export const runtime = 'nodejs'

const getTargetPage = (eventDate) => {
  if (!eventDate) return 'eventsUpcoming'
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const eventTime = new Date(eventDate).getTime()
  return eventTime < startOfToday ? 'eventsPast' : 'eventsUpcoming'
}

export default async function EventRedirectPage({ params }) {
  const { id } = params ?? {}
  if (!id) return redirect('/cabinet/eventsUpcoming')
  await dbConnect()
  const event = await Events.findById(id).select('eventDate').lean()
  if (!event) return redirect('/cabinet/eventsUpcoming')
  const targetPage = getTargetPage(event.eventDate)
  return redirect(`/cabinet/${targetPage}?openEvent=${id}`)
}
