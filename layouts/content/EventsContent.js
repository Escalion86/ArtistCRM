'use client'

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
import { useAtomValue, useSetAtom } from 'jotai'
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
import useUiDensity from '@helpers/useUiDensity'
import { getData } from '@helpers/CRUD'

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

const parseBooleanSearchParam = (value) => {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return null
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

const EventsContent = ({ filter = 'all', eventsPaging = null }) => {
  const { isCompact } = useUiDensity()
  const events = useAtomValue(eventsAtom)
  const setEvents = useSetAtom(eventsAtom)
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
  const [pastHasMore, setPastHasMore] = useState(false)
  const [pastNextBefore, setPastNextBefore] = useState(null)
  const [pastLoadingMore, setPastLoadingMore] = useState(false)
  const [pastTotalCount, setPastTotalCount] = useState(0)
  const [serverFilteredCount, setServerFilteredCount] = useState(null)
  const [pastActiveClosableCount, setPastActiveClosableCount] = useState(0)
  const reminderShownRef = useRef(false)
  const noDepositReminderShownRef = useRef(false)
  const statusFilterKeys = useMemo(() => getStatusFilterKeys(filter), [filter])
  const itemHeight = isCompact ? 152 : 170

  useEffect(() => {
    if (filter !== 'past') {
      setPastHasMore(false)
      setPastNextBefore(null)
      setPastLoadingMore(false)
      setPastTotalCount(0)
      setServerFilteredCount(null)
      return
    }
    setPastHasMore(Boolean(eventsPaging?.hasMore))
    setPastNextBefore(eventsPaging?.nextBefore || null)
    setPastTotalCount(Number(eventsPaging?.totalCount || 0))
  }, [
    eventsPaging?.hasMore,
    eventsPaging?.nextBefore,
    eventsPaging?.totalCount,
    filter,
  ])

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

  useEffect(() => {
    if (filter !== 'past') return

    const finishedParam = parseBooleanSearchParam(
      searchParams?.get('statusFinished')
    )
    const closedParam = parseBooleanSearchParam(
      searchParams?.get('statusClosed')
    )
    const canceledParam = parseBooleanSearchParam(
      searchParams?.get('statusCanceled')
    )

    if (
      finishedParam === null &&
      closedParam === null &&
      canceledParam === null
    ) {
      return
    }

    setStatusFilter({
      finished:
        finishedParam === null
          ? getStatusFilterDefaults('past').finished
          : finishedParam,
      closed:
        closedParam === null
          ? getStatusFilterDefaults('past').closed
          : closedParam,
      canceled:
        canceledParam === null
          ? getStatusFilterDefaults('past').canceled
          : canceledParam,
    })
  }, [filter, searchParams])

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

  useEffect(() => {
    if (filter !== 'upcoming') return

    let isActive = true

    ;(async () => {
      try {
        const response = await getData(
          '/api/events?scope=past&countOnly=1&statusFinished=true&statusClosed=false&statusCanceled=false',
          null,
          null,
          null,
          true
        )
        const totalCount = Number(response?.meta?.totalCount)
        if (!isActive) return
        setPastActiveClosableCount(Number.isFinite(totalCount) ? totalCount : 0)
      } catch (error) {
        if (!isActive) return
        setPastActiveClosableCount(0)
      }
    })()

    return () => {
      isActive = false
    }
  }, [filter])

  const filterName =
    filter === 'upcoming'
      ? 'Предстоящие'
      : filter === 'past'
        ? 'Прошедшие'
        : 'Все'

  const isDefaultPastFilters =
    filter === 'past' &&
    !selectedTown &&
    !additionalQuickFilter &&
    checkFilter.checked &&
    checkFilter.unchecked &&
    statusFilter.finished === true &&
    statusFilter.closed === true &&
    statusFilter.canceled === false

  useEffect(() => {
    if (filter !== 'past') return

    if (!pastHasMore) {
      setServerFilteredCount(sortedEvents.length)
      return
    }

    if (isDefaultPastFilters && pastTotalCount > 0) {
      setServerFilteredCount(pastTotalCount)
      return
    }

    let isActive = true
    const search = new URLSearchParams({
      scope: 'past',
      countOnly: '1',
      statusFinished: String(Boolean(statusFilter.finished)),
      statusClosed: String(Boolean(statusFilter.closed)),
      statusCanceled: String(Boolean(statusFilter.canceled)),
    })

    if (selectedTown) search.set('town', selectedTown)
    if (additionalQuickFilter)
      search.set('additionalQuick', additionalQuickFilter)
    if (checkFilter.checked !== checkFilter.unchecked) {
      search.set('calendarChecked', String(Boolean(checkFilter.checked)))
    }

    ;(async () => {
      try {
        const response = await getData(
          `/api/events?${search.toString()}`,
          null,
          null,
          null,
          true
        )
        const totalCount = Number(response?.meta?.totalCount)
        if (!isActive) return
        setServerFilteredCount(
          Number.isFinite(totalCount) ? totalCount : sortedEvents.length
        )
      } catch (error) {
        if (!isActive) return
        setServerFilteredCount(sortedEvents.length)
      }
    })()

    return () => {
      isActive = false
    }
  }, [
    additionalQuickFilter,
    checkFilter.checked,
    checkFilter.unchecked,
    filter,
    isDefaultPastFilters,
    pastHasMore,
    pastTotalCount,
    selectedTown,
    sortedEvents.length,
    statusFilter.canceled,
    statusFilter.closed,
    statusFilter.finished,
  ])

  const displayedCount =
    filter === 'past'
      ? (serverFilteredCount ?? sortedEvents.length)
      : sortedEvents.length

  const toggleAdditionalQuickFilter = (value) => {
    setAdditionalQuickFilter((prev) => (prev === value ? '' : value))
  }

  const getAdditionalQuickFilterButtonClass = (segment) => {
    const isActive = additionalQuickFilter === segment
    if (segment === 'overdue') {
      return isActive
        ? 'rounded status-filter-btn--overdue-active hover:brightness-95'
        : 'rounded status-filter-btn--overdue hover:brightness-95'
    }
    if (segment === 'today') {
      return isActive
        ? 'rounded status-filter-btn--today-active hover:brightness-95'
        : 'rounded status-filter-btn--today hover:brightness-95'
    }
    return isActive
      ? 'rounded status-filter-btn--tomorrow-active hover:brightness-95'
      : 'rounded status-filter-btn--tomorrow hover:brightness-95'
  }

  useEffect(() => {
    if (!additionalQuickFilter) return
    if ((additionalSummary?.[additionalQuickFilter] ?? 0) > 0) return
    setAdditionalQuickFilter('')
  }, [additionalQuickFilter, additionalSummary])

  const RowComponent = useCallback(
    ({ index, style }) => {
      if (filter === 'past' && index >= sortedEvents.length) {
        return (
          <div
            style={{ ...style, padding: '6px 8px' }}
            className="flex items-center justify-center"
          >
            <AppButton
              variant="secondary"
              size="sm"
              className="rounded-md px-4"
              disabled={pastLoadingMore}
              onClick={async () => {
                if (pastLoadingMore || !pastHasMore) return
                setPastLoadingMore(true)
                try {
                  const query = pastNextBefore
                    ? `?scope=past&limit=120&before=${encodeURIComponent(pastNextBefore)}`
                    : '?scope=past&limit=120'
                  const response = await getData(
                    `/api/events${query}`,
                    null,
                    null,
                    null,
                    true
                  )
                  const loadedItems = Array.isArray(response?.data)
                    ? response.data
                    : []
                  const nextMeta = response?.meta ?? {}

                  if (loadedItems.length > 0) {
                    setEvents((prev) => {
                      const prevIds = new Set(
                        (prev ?? []).map((item) => String(item?._id))
                      )
                      const uniqueNew = loadedItems.filter(
                        (item) => !prevIds.has(String(item?._id))
                      )
                      return uniqueNew.length > 0
                        ? [...(prev ?? []), ...uniqueNew]
                        : (prev ?? [])
                    })
                  }

                  setPastHasMore(Boolean(nextMeta?.hasMore))
                  setPastNextBefore(nextMeta?.nextBefore || null)
                  setPastTotalCount(
                    Number(nextMeta?.totalCount || loadedItems.length || 0)
                  )
                } finally {
                  setPastLoadingMore(false)
                }
              }}
            >
              {pastLoadingMore ? 'Загрузка...' : 'Загрузить еще прошедшие'}
            </AppButton>
          </div>
        )
      }
      const event = sortedEvents[index]

      return (
        <EventCard
          eventId={event._id}
          style={{ ...style, padding: '6px 8px' }}
        />
      )
    },
    [
      filter,
      pastHasMore,
      pastLoadingMore,
      pastNextBefore,
      setEvents,
      sortedEvents,
    ]
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
            <div className="tablet:w-52 w-[min(56vw,160px)]">
              <ComboBox
                label="Город"
                items={townsOptions}
                value={selectedTown}
                onChange={(value) => setSelectedTown(value ?? '')}
                placeholder="Все города"
                activePlaceholder
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
                  {filterName}: {displayedCount}
                </MutedText>
                <MutedText className="tablet:inline hidden">
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
        <SectionCard className="border border-gray-200 bg-white/95 p-3 shadow-sm">
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
            <div className="tablet:w-auto tablet:flex-1 tablet:justify-end flex w-full items-center justify-start">
              <div className="phoneH:flex-row tablet:w-auto flex w-full flex-col gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  className="phoneH:w-auto w-full rounded-md px-4 font-semibold shadow-md"
                  onClick={() => modalsFunc.event?.upcomingOverview?.()}
                >
                  Ближайшие события
                  {inAppReminderSummary.soon2h > 0
                    ? ` • 2ч: ${inAppReminderSummary.soon2h}`
                    : ''}
                </AppButton>
                {filter === 'upcoming' ? (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="phoneH:w-auto w-full rounded-md px-4 font-semibold"
                    onClick={() =>
                      router.push(
                        '/cabinet/eventsPast?statusFinished=true&statusClosed=false&statusCanceled=false'
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      Закрыть прошедшие мероприятия
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white shadow-sm">
                        {pastActiveClosableCount}
                      </span>
                    </span>
                  </AppButton>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard className="min-h-0 flex-1 overflow-hidden border-0 bg-transparent shadow-none">
        {sortedEvents.length > 0 ? (
          <List
            listRef={listRef}
            rowCount={
              filter === 'past' && pastHasMore
                ? sortedEvents.length + 1
                : sortedEvents.length
            }
            rowHeight={itemHeight}
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
