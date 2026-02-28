'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { List, useListRef } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import AddIconButton from '@components/AddIconButton'
import ComboBox from '@components/ComboBox'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import EventCheckToggleButtons from '@components/IconToggleButtons/EventCheckToggleButtons'
import EventStatusToggleButtons from '@components/IconToggleButtons/EventStatusToggleButtons'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import eventsAtom from '@state/atoms/eventsAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
// import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom, modalsAtom } from '@state/atoms'
import EventCard from '@layouts/cards/EventCard'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  eventHasAdditionalSegment,
  getAdditionalEventsSummary,
  getInAppReminderSummary,
  getSoonNoDepositEvents,
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
  const rawEnd = event?.dateEnd ?? event?.eventDate ?? null
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
  const transactions = useAtomValue(transactionsAtom)
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
  const reminderShownRef = useRef(false)
  const noDepositReminderShownRef = useRef(false)
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
  const inAppReminderSummary = useMemo(
    () => getInAppReminderSummary(filteredByStatus),
    [filteredByStatus]
  )
  const soonNoDepositEvents = useMemo(
    () => getSoonNoDepositEvents(filteredByStatus, transactions, new Date(), 3),
    [filteredByStatus, transactions]
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

  useEffect(() => {
    if (filter !== 'upcoming') return
    if (typeof window === 'undefined') return
    if (modals.length > 0) return
    if (inAppReminderSummary.total <= 0) return
    if (reminderShownRef.current) return

    const dateKey = new Date().toISOString().slice(0, 10)
    const storageKey = `inAppReminderShown:${dateKey}`
    const signature = [
      inAppReminderSummary.overdue,
      inAppReminderSummary.today,
      inAppReminderSummary.soon2h,
    ].join(':')
    const savedSignature = window.localStorage.getItem(storageKey)
    if (savedSignature === signature) return

    reminderShownRef.current = true
    window.localStorage.setItem(storageKey, signature)

    modalsFunc.event?.upcomingOverview?.()
  }, [filter, inAppReminderSummary, modals.length, modalsFunc])

  useEffect(() => {
    if (filter !== 'upcoming') return
    if (typeof window === 'undefined') return
    if (modals.length > 0) return
    if (soonNoDepositEvents.length <= 0) return
    if (noDepositReminderShownRef.current) return

    const dateKey = new Date().toISOString().slice(0, 10)
    const storageKey = `noDepositReminderShown:${dateKey}`
    const signature = soonNoDepositEvents
      .slice(0, 8)
      .map((item) => String(item?._id))
      .join(',')
    const savedSignature = window.localStorage.getItem(storageKey)
    if (savedSignature === signature) return

    noDepositReminderShownRef.current = true
    window.localStorage.setItem(storageKey, signature)

    modalsFunc.add({
      title: 'Просрочено ожидание задатка',
      text: `Мероприятий с просроченным ожиданием задатка: ${soonNoDepositEvents.length}`,
      confirmButtonName: 'Открыть ближайшие события',
      declineButtonName: 'Позже',
      showDecline: true,
      onConfirm: () => modalsFunc.event?.upcomingOverview?.(),
    })
  }, [filter, modals.length, modalsFunc, soonNoDepositEvents])

  const filterName =
    filter === 'upcoming'
      ? 'Предстоящие'
      : filter === 'past'
        ? 'Прошедшие'
        : 'Все'

  const toggleAdditionalQuickFilter = (value) => {
    setAdditionalQuickFilter((prev) => (prev === value ? '' : value))
  }

  const getAdditionalQuickFilterButtonClass = (segment) => {
    const isActive = additionalQuickFilter === segment
    if (segment === 'overdue') {
      return isActive
        ? 'rounded border-red-700 bg-red-600 text-white hover:bg-red-700'
        : 'rounded border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
    }
    if (segment === 'today') {
      return isActive
        ? 'rounded border-amber-700 bg-amber-500 text-white hover:bg-amber-600'
        : 'rounded border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
    }
    return isActive
      ? 'rounded border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'
      : 'rounded border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  }

  useEffect(() => {
    if (!additionalQuickFilter) return
    if ((additionalSummary?.[additionalQuickFilter] ?? 0) > 0) return
    setAdditionalQuickFilter('')
  }, [additionalQuickFilter, additionalSummary])

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
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions
          className="w-full tablet:flex-nowrap gap-y-2"
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
              <div className="flex flex-wrap items-center justify-center w-full gap-2 tablet:w-auto tablet:flex-nowrap tablet:justify-start tablet:gap-3">
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
                <MutedText className="hidden tablet:inline">
                  Всего: {events.length}
                </MutedText>
                <AddIconButton
                  disabled={!modalsFunc.event?.create}
                  onClick={() => modalsFunc.event?.create?.()}
                  title="Добавить мероприятие"
                  size="sm"
                  variant="neutral"
                />
              </div>
            </>
          }
        />
      </ContentHeader>
      {filter === 'upcoming' || filter === 'past' ? (
        <SectionCard className="p-3 border border-gray-200 shadow-sm bg-white/95">
          <div className="flex flex-wrap items-center gap-2">
            {additionalSummary.overdue > 0 ? (
              <AppButton
                variant="secondary"
                size="sm"
                className={getAdditionalQuickFilterButtonClass('overdue')}
                onClick={() => toggleAdditionalQuickFilter('overdue')}
              >
                Просрочено: {additionalSummary.overdue}
              </AppButton>
            ) : null}
            {additionalSummary.today > 0 ? (
              <AppButton
                variant="secondary"
                size="sm"
                className={getAdditionalQuickFilterButtonClass('today')}
                onClick={() => toggleAdditionalQuickFilter('today')}
              >
                Сегодня: {additionalSummary.today}
              </AppButton>
            ) : null}
            {additionalSummary.tomorrow > 0 ? (
              <AppButton
                variant="secondary"
                size="sm"
                className={getAdditionalQuickFilterButtonClass('tomorrow')}
                onClick={() => toggleAdditionalQuickFilter('tomorrow')}
              >
                Завтра: {additionalSummary.tomorrow}
              </AppButton>
            ) : null}
            {soonNoDepositEvents.length > 0 ? (
              <AppButton
                variant="danger"
                size="sm"
                className="rounded"
                onClick={() => modalsFunc.event?.upcomingOverview?.()}
              >
                Просрочен задаток: {soonNoDepositEvents.length}
              </AppButton>
            ) : null}
            <div className="flex w-full items-center justify-start tablet:w-auto tablet:flex-1 tablet:justify-end">
              <AppButton
                variant="primary"
                size="sm"
                className="w-full rounded-md px-4 font-semibold shadow-md tablet:w-auto"
                onClick={() => modalsFunc.event?.upcomingOverview?.()}
              >
                Ближайшие события
                {inAppReminderSummary.soon2h > 0
                  ? ` • 2ч: ${inAppReminderSummary.soon2h}`
                  : ''}
              </AppButton>
            </div>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard className="flex-1 min-h-0 overflow-hidden bg-transparent border-0 shadow-none">
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
