'use client'

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import ComboBox from '@components/ComboBox'
import EventCheckToggleButtons from '@components/IconToggleButtons/EventCheckToggleButtons'
import eventsAtom from '@state/atoms/eventsAtom'
// import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom, modalsAtom } from '@state/atoms'
import EventCard from '@layouts/cards/EventCard'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const ITEM_HEIGHT = 160

const EventsContent = ({ filter = 'all' }) => {
  const events = useAtomValue(eventsAtom)
  // const siteSettings = useAtomValue(siteSettingsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const modals = useAtomValue(modalsAtom)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const listRef = useRef(null)
  const openHandledRef = useRef(false)
  const [selectedTown, setSelectedTown] = useState('')
  const [checkFilter, setCheckFilter] = useState({
    checked: true,
    unchecked: true,
  })

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

  const filteredEvents = useMemo(() => {
    if (!selectedTown) return baseEvents
    return baseEvents.filter(
      (event) => (event?.address?.town ?? '') === selectedTown
    )
  }, [baseEvents, selectedTown])

  const hasUncheckedEvents = useMemo(
    () => filteredEvents.some((event) => !event?.calendarImportChecked),
    [filteredEvents]
  )

  useEffect(() => {
    if (!selectedTown) return
    if (townsOptions.includes(selectedTown)) return
    setSelectedTown('')
  }, [selectedTown, townsOptions])

  useEffect(() => {
    if (modals.length === 0) {
      openHandledRef.current = false
    }
  }, [modals.length])

  const filteredByCheck = useMemo(() => {
    if (checkFilter.checked && checkFilter.unchecked) return filteredEvents
    if (checkFilter.checked)
      return filteredEvents.filter((event) => event?.calendarImportChecked)
    if (checkFilter.unchecked)
      return filteredEvents.filter((event) => !event?.calendarImportChecked)
    return filteredEvents
  }, [checkFilter, filteredEvents])

  const sortedEvents = useMemo(() => {
    const sorter = (a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0
      return filter === 'upcoming' ? dateA - dateB : dateB - dateA
    }
    return [...filteredByCheck].sort(sorter)
  }, [filteredByCheck, filter])

  useEffect(() => {
    const targetId = searchParams?.get('openEvent')
    if (!targetId) return
    if (openHandledRef.current) return

    const indexInAll = events.findIndex(
      (item) => String(item?._id) === String(targetId)
    )
    if (indexInAll === -1) return
    const event = events[indexInAll]
    const eventDate = event?.eventDate ? new Date(event.eventDate) : null
    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()
    const shouldBeUpcoming =
      !eventDate || eventDate.getTime() >= startOfToday
    const expectedPage = shouldBeUpcoming ? 'eventsUpcoming' : 'eventsPast'

    if (
      filter !== 'all' &&
      expectedPage !== (filter === 'upcoming' ? 'eventsUpcoming' : 'eventsPast')
    ) {
      router.replace(`/cabinet/${expectedPage}?openEvent=${targetId}`)
      return
    }

    const eventTown = event?.address?.town ?? ''
    if (selectedTown && eventTown !== selectedTown) {
      setSelectedTown(eventTown)
      return
    }

    if (!checkFilter.checked || !checkFilter.unchecked) {
      const isChecked = !!event?.calendarImportChecked
      const isVisible =
        (isChecked && checkFilter.checked) ||
        (!isChecked && checkFilter.unchecked)
      if (!isVisible) {
        setCheckFilter({ checked: true, unchecked: true })
        return
      }
    }

    const index = sortedEvents.findIndex(
      (item) => String(item?._id) === String(targetId)
    )
    if (index === -1) return
    openHandledRef.current = true
    listRef.current?.scrollToItem(index, 'center')
    setTimeout(() => {
      modalsFunc.event?.view(targetId)
      if (pathname) router.replace(pathname, { scroll: false })
    }, 200)
  }, [
    checkFilter.checked,
    checkFilter.unchecked,
    events,
    filter,
    modalsFunc.event,
    pathname,
    router,
    searchParams,
    selectedTown,
    sortedEvents,
  ])

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
          <div className="flex flex-wrap items-center gap-3">
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
            {filter !== 'all' && hasUncheckedEvents && (
              <EventCheckToggleButtons
                value={checkFilter}
                onChange={setCheckFilter}
              />
            )}
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
            ref={listRef}
            rowCount={sortedEvents.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={{}}
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
