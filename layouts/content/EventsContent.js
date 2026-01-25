'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import ComboBox from '@components/ComboBox'
import eventsAtom from '@state/atoms/eventsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'
import EventCard from '@layouts/cards/EventCard'

const ITEM_HEIGHT = 190

const EventsContent = ({ filter = 'all' }) => {
  const events = useAtomValue(eventsAtom)
  const siteSettings = useAtomValue(siteSettingsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [selectedTown, setSelectedTown] = useState('')

  const baseEvents = useMemo(() => {
    if (filter === 'all') return events

    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()

    return events.filter((event) => {
      if (!event?.eventDate) return filter === 'upcoming'
      const eventDate = new Date(event.eventDate).getTime()
      return filter === 'upcoming'
        ? eventDate >= startOfToday
        : eventDate < startOfToday
    })
  }, [events, filter])

  const townsOptions = useMemo(() => {
    const townsSet = new Set()
    baseEvents.forEach((event) => {
      const town = event?.address?.town
      if (typeof town === 'string' && town.trim()) townsSet.add(town.trim())
    })
    return Array.from(townsSet).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [baseEvents])

  useEffect(() => {
    if (!selectedTown) return
    if (townsOptions.includes(selectedTown)) return
    setSelectedTown('')
  }, [selectedTown, townsOptions])

  const filteredEvents = useMemo(() => {
    if (!selectedTown) return baseEvents
    return baseEvents.filter(
      (event) => (event?.address?.town ?? '') === selectedTown
    )
  }, [baseEvents, selectedTown])

  const sortedEvents = useMemo(() => {
    const sorter = (a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0
      return filter === 'upcoming' ? dateA - dateB : dateB - dateA
    }
    return [...filteredEvents].sort(sorter)
  }, [filteredEvents, filter])

  const filterName =
    filter === 'upcoming'
      ? 'Предстоящие'
      : filter === 'past'
      ? 'Прошедшие'
      : 'Все'

  const RowComponent = useCallback(
    ({ index, style }) => {
      const event = sortedEvents[index]

      return (
        <EventCard
          eventId={event._id}
          style={{ ...style, padding: '6px 8px' }}
        />
      )
    },
    [sortedEvents]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <div className="flex flex-1 items-center justify-between">
          <div className="w-52">
            <ComboBox
              label="Город"
              items={townsOptions}
              value={selectedTown}
              onChange={(value) => setSelectedTown(value ?? '')}
              placeholder="Все города"
              fullWidth
              smallMargin
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>
              {filterName}: {sortedEvents.length}
            </span>
            <span className="tablet:inline hidden">Всего: {events.length}</span>
            <Button
              name="+"
              collapsing
              className="action-icon-button h-9 w-9 rounded-full text-lg"
              onClick={() => modalsFunc.event?.add()}
              disabled={!modalsFunc.event?.add}
            />
          </div>
        </div>
      </ContentHeader>
      <div className="min-h-0 flex-1 overflow-hidden">
        {sortedEvents.length > 0 ? (
          <List
            rowCount={sortedEvents.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            defaultHeight={400}
            defaultWidth={800}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            Мероприятий пока нет для выбранного периода
          </div>
        )}
      </div>
    </div>
  )
}

export default EventsContent
