'use client'

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { List, useListRef } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import ComboBox from '@components/ComboBox'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import EventCheckToggleButtons from '@components/IconToggleButtons/EventCheckToggleButtons'
import EventStatusToggleButtons from '@components/IconToggleButtons/EventStatusToggleButtons'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import eventsAtom from '@state/atoms/eventsAtom'
// import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom, modalsAtom } from '@state/atoms'
import EventCard from '@layouts/cards/EventCard'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  eventHasAdditionalSegment,
  getAdditionalEventsSummary,
} from '@helpers/additionalEvents'
import AppButton from '@components/AppButton'

const ITEM_HEIGHT = 170
const getStatusFilterDefaults = (filter) => {
  if (filter === 'upcoming') {
    return {
      request: true,
      active: true,
      canceled: false,
    }
  }
  if (filter === 'past') {
    return {
      finished: true,
      closed: true,
      canceled: false,
    }
  }
  return {
    request: true,
    active: true,
    finished: true,
    closed: true,
    canceled: false,
  }
}

const getStatusFilterKeys = (filter) => {
  if (filter === 'upcoming') return ['request', 'active', 'canceled']
  if (filter === 'past') return ['finished', 'closed', 'canceled']
  return ['request', 'active', 'finished', 'closed', 'canceled']
}

const getEventStatusFlags = (event, now) => {
  const status = event?.status
  const isRequest = status === 'draft'
  const isCanceled = status === 'canceled'
  const isClosed = status === 'closed'
  const rawEnd = event?.dateEnd ?? event?.eventDate ?? event?.dateStart ?? null
  const endDate = rawEnd ? new Date(rawEnd) : null
  const isFinished =
    !isRequest &&
    !isCanceled &&
    !isClosed &&
    endDate instanceof Date &&
    !Number.isNaN(endDate.getTime()) &&
    endDate.getTime() < now.getTime()
  const isActive = !isRequest && !isCanceled && !isClosed && !isFinished

  return {
    request: isRequest,
    active: isActive,
    finished: isFinished,
    closed: isClosed,
    canceled: isCanceled,
  }
}

const EventsContent = ({ filter = 'all' }) => {
  const events = useAtomValue(eventsAtom)
  // const siteSettings = useAtomValue(siteSettingsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const modals = useAtomValue(modalsAtom)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const listRef = useListRef()
  const openHandledRef = useRef(false)
  const [selectedTown, setSelectedTown] = useState('')
  const [pendingOpenId, setPendingOpenId] = useState(null)
  const [checkFilter, setCheckFilter] = useState({
    checked: true,
    unchecked: true,
  })
  const [statusFilter, setStatusFilter] = useState(() =>
    getStatusFilterDefaults(filter)
  )
  const [additionalQuickFilter, setAdditionalQuickFilter] = useState('')
  const statusFilterKeys = useMemo(() => getStatusFilterKeys(filter), [filter])

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
  }, [selectedTown, baseEvents])

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

  useEffect(() => {
    setStatusFilter(getStatusFilterDefaults(filter))
    setAdditionalQuickFilter('')
  }, [filter])

  const filteredByCheck = useMemo(() => {
    if (checkFilter.checked && checkFilter.unchecked) return filteredEvents
    if (checkFilter.checked)
      return filteredEvents.filter((event) => event?.calendarImportChecked)
    if (checkFilter.unchecked)
      return filteredEvents.filter((event) => !event?.calendarImportChecked)
    return filteredEvents
  }, [checkFilter, filteredEvents])

  const filteredByStatus = useMemo(() => {
    const allSelected = statusFilterKeys.every((key) =>
      Boolean(statusFilter[key])
    )
    if (allSelected) return filteredByCheck

    const now = new Date()
    return filteredByCheck.filter((event) => {
      const flags = getEventStatusFlags(event, now)
      return statusFilterKeys.some(
        (key) => Boolean(statusFilter[key]) && Boolean(flags[key])
      )
    })
  }, [filteredByCheck, statusFilter, statusFilterKeys])

  const additionalSummary = useMemo(
    () => getAdditionalEventsSummary(filteredByStatus),
    [filteredByStatus]
  )

  const filteredByAdditionalQuick = useMemo(() => {
    if (!additionalQuickFilter) return filteredByStatus
    const now = new Date()
    return filteredByStatus.filter((event) =>
      eventHasAdditionalSegment(event, additionalQuickFilter, now)
    )
  }, [additionalQuickFilter, filteredByStatus])

  const sortedEvents = useMemo(() => {
    const sorter = (a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0
      return filter === 'upcoming' ? dateA - dateB : dateB - dateA
    }
    return [...filteredByAdditionalQuick].sort(sorter)
  }, [filteredByAdditionalQuick, filter])

  useEffect(() => {
    const urlTargetId = searchParams?.get('openEvent')
    if (!urlTargetId && !pendingOpenId && typeof window !== 'undefined') {
      const storedId = window.sessionStorage.getItem('openEvent')
      if (storedId) {
        const storedAt = Number(
          window.sessionStorage.getItem('openEventAt') || 0
        )
        if (!storedAt || Date.now() - storedAt < 2 * 60 * 1000) {
          setPendingOpenId(storedId)
        }
        window.sessionStorage.removeItem('openEvent')
        window.sessionStorage.removeItem('openEventAt')
        window.sessionStorage.removeItem('openEventPage')
      }
    }

    const targetId = urlTargetId || pendingOpenId
    if (!targetId) return
    let isActive = true
    let attempts = 0

    const scheduleRetry = () => {
      if (!isActive) return
      if (attempts >= 10) return
      attempts += 1
      setTimeout(tryOpen, 250)
    }

    const tryOpen = () => {
      if (!isActive) return
      if (openHandledRef.current) return
      if (!modalsFunc.event?.view) return scheduleRetry()
      if (!events || events.length === 0) return scheduleRetry()

      const indexInAll = events.findIndex(
        (item) => String(item?._id) === String(targetId)
      )
      if (indexInAll === -1) return scheduleRetry()

      const event = events[indexInAll]
      const eventDate = event?.eventDate ? new Date(event.eventDate) : null
      const now = new Date()
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime()
      const shouldBeUpcoming = !eventDate || eventDate.getTime() >= startOfToday
      const expectedPage = shouldBeUpcoming ? 'eventsUpcoming' : 'eventsPast'

      if (
        filter !== 'all' &&
        expectedPage !==
          (filter === 'upcoming' ? 'eventsUpcoming' : 'eventsPast')
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

      const allStatusSelected = statusFilterKeys.every((key) =>
        Boolean(statusFilter[key])
      )
      if (!allStatusSelected) {
        const flags = getEventStatusFlags(event, now)
        const isVisible = statusFilterKeys.some(
          (key) => Boolean(statusFilter[key]) && Boolean(flags[key])
        )
        if (!isVisible) {
          setStatusFilter(getStatusFilterDefaults(filter))
          return
        }
      }

      const index = sortedEvents.findIndex(
        (item) => String(item?._id) === String(targetId)
      )
      if (index === -1) return scheduleRetry()

      let scrollAttempts = 0
      const tryScroll = () => {
        if (!isActive) return
        if (listRef.current?.scrollToRow) {
          listRef.current.scrollToRow({ index, align: 'center' })
        } else if (scrollAttempts < 6) {
          scrollAttempts += 1
          setTimeout(tryScroll, 100)
        }
      }
      tryScroll()

      setTimeout(() => {
        if (!isActive) return
        modalsFunc.event?.view(targetId)
        openHandledRef.current = true
        if (pendingOpenId) setPendingOpenId(null)
        if (pathname) router.replace(pathname, { scroll: false })
      }, 200)
    }

    tryOpen()
    return () => {
      isActive = false
    }
  }, [
    checkFilter.checked,
    checkFilter.unchecked,
    events,
    filter,
    modalsFunc.event,
    pathname,
    listRef,
    router,
    searchParams,
    selectedTown,
    sortedEvents,
    pendingOpenId,
    statusFilter,
    statusFilterKeys,
  ])

  const filterName =
    filter === 'upcoming'
      ? 'Предстоящие'
      : filter === 'past'
        ? 'Прошедшие'
        : 'Все'

  const toggleAdditionalQuickFilter = (value) => {
    setAdditionalQuickFilter((prev) => (prev === value ? '' : value))
  }

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
        <HeaderActions
          className="tablet:flex-nowrap w-full gap-y-2"
          leftClassName="min-w-0"
          bottomClassName="w-full tablet:w-auto"
          rightClassName="ml-auto"
          left={
            <div className="tablet:w-52 w-[min(56vw,220px)]">
              <ComboBox
                label="Город"
                items={townsOptions}
                value={selectedTown}
                onChange={(value) => setSelectedTown(value ?? '')}
                placeholder="Все города"
                fullWidth
                noMargin
                className="mt-1.5"
              />
            </div>
          }
          bottom={
            filter !== 'all' ? (
              <div className="tablet:w-auto tablet:flex-nowrap tablet:justify-start tablet:gap-3 flex w-full flex-wrap items-center justify-center gap-2">
                {hasUncheckedEvents && (
                  <EventCheckToggleButtons
                    value={checkFilter}
                    onChange={setCheckFilter}
                  />
                )}
                <EventStatusToggleButtons
                  value={statusFilter}
                  onChange={setStatusFilter}
                  mode={filter}
                />
              </div>
            ) : null
          }
          right={
            <>
              <div className="flex items-center gap-2">
                <MutedText>
                  {filterName}: {sortedEvents.length}
                </MutedText>
                <MutedText className="tablet:inline hidden">
                  Всего: {events.length}
                </MutedText>
                <Button
                  name="+"
                  collapsing
                  className="action-icon-button action-icon-button--neutral h-9 w-9 rounded-full text-lg"
                  disabled={!modalsFunc.event?.create}
                  onClick={() => modalsFunc.event?.create?.()}
                />
              </div>
            </>
          }
        />
      </ContentHeader>
      {filter === 'upcoming' ? (
        <SectionCard className="border border-gray-200 bg-white/95 p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              variant={additionalQuickFilter === 'overdue' ? 'primary' : 'secondary'}
              size="sm"
              className="rounded"
              onClick={() => toggleAdditionalQuickFilter('overdue')}
            >
              Просрочено: {additionalSummary.overdue}
            </AppButton>
            <AppButton
              variant={additionalQuickFilter === 'today' ? 'primary' : 'secondary'}
              size="sm"
              className="rounded"
              onClick={() => toggleAdditionalQuickFilter('today')}
            >
              Сегодня: {additionalSummary.today}
            </AppButton>
            <AppButton
              variant={additionalQuickFilter === 'tomorrow' ? 'primary' : 'secondary'}
              size="sm"
              className="rounded"
              onClick={() => toggleAdditionalQuickFilter('tomorrow')}
            >
              Завтра: {additionalSummary.tomorrow}
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              className="rounded"
              onClick={() => modalsFunc.event?.upcomingOverview?.()}
            >
              Ближайшие события
            </AppButton>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard className="min-h-0 flex-1 overflow-hidden border-0 bg-transparent shadow-none">
        {sortedEvents.length > 0 ? (
          <List
            listRef={listRef}
            rowCount={sortedEvents.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={{}}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <EmptyState text="Для выбранных фильтьров мероприятий пока нет" />
        )}
      </SectionCard>
    </div>
  )
}

export default EventsContent
