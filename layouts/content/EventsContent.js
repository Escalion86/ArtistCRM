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
  getAdditionalEventsListBySegments,
  eventHasAdditionalSegment,
  getAdditionalEventsSummary,
  getInAppReminderSummary,
  getUpcomingEventsByDays,
  getSoonNoDepositEvents,
} from '@helpers/additionalEvents'
import AppButton from '@components/AppButton'
import useUiDensity from '@helpers/useUiDensity'
import { getData } from '@helpers/CRUD'
import { DAYS_OF_WEEK } from '@helpers/constants'
import { isEventCreatedViaPublicApi } from '@helpers/eventSource'

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

const getEventCompletionTime = (event) => {
  const raw = event?.dateEnd ?? event?.eventDate ?? null
  if (!raw) return null
  const time = new Date(raw).getTime()
  return Number.isNaN(time) ? null : time
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

const MONTH_VIEW_DAY_CELLS = 42

const toMonthStart = (value = new Date()) =>
  new Date(value.getFullYear(), value.getMonth(), 1)

const toDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const toMinuteOfDay = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 0
  return date.getHours() * 60 + date.getMinutes()
}

const getValidDateTime = (value) => {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
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
  const [viewMode, setViewMode] = useState('list')
  const [monthCursor, setMonthCursor] = useState(() => toMonthStart(new Date()))
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

    const nowTime = Date.now()

    return events.filter((event) => {
      const completionTime = getEventCompletionTime(event)
      if (completionTime === null) return filter === 'upcoming'
      return filter === 'upcoming'
        ? completionTime >= nowTime
        : completionTime < nowTime
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
  const upcomingOverviewBadges = useMemo(() => {
    const now = new Date()
    const segmentedAdditional = getAdditionalEventsListBySegments(events, now)
    const upcomingEvents3Days = getUpcomingEventsByDays(events, 3, now)

    return [
      {
        key: 'overdue',
        title: 'Просрочено',
        value: Number(segmentedAdditional?.overdue?.length || 0),
        className: 'bg-red-600 text-white',
      },
      {
        key: 'today',
        title: 'Сегодня',
        value: Number(segmentedAdditional?.today?.length || 0),
        className: 'bg-amber-500 text-white',
      },
      {
        key: 'tomorrow',
        title: 'Завтра',
        value: Number(segmentedAdditional?.tomorrow?.length || 0),
        className: 'bg-blue-600 text-white',
      },
      {
        key: 'upcoming3days',
        title: 'Мероприятия на 3 дня',
        value: Number(upcomingEvents3Days?.length || 0),
        className: 'bg-emerald-600 text-white',
      },
    ].filter((item) => item.value > 0)
  }, [events])

  const filteredByAdditionalQuick = useMemo(() => {
    if (!additionalQuickFilter) return filteredByStatus
    const now = new Date()
    return filteredByStatus.filter((event) =>
      eventHasAdditionalSegment(event, additionalQuickFilter, now)
    )
  }, [additionalQuickFilter, filteredByStatus])

  const sortedEvents = useMemo(() => {
    if (filter === 'upcoming') {
      return [...filteredByAdditionalQuick].sort((a, b) => {
        const aEventDate = getValidDateTime(a?.eventDate)
        const bEventDate = getValidDateTime(b?.eventDate)
        const aNoDate = aEventDate === null
        const bNoDate = bEventDate === null
        const aApiNoDate = aNoDate && isEventCreatedViaPublicApi(a)
        const bApiNoDate = bNoDate && isEventCreatedViaPublicApi(b)

        if (aApiNoDate !== bApiNoDate) return aApiNoDate ? -1 : 1
        if (aNoDate !== bNoDate) return aNoDate ? 1 : -1

        if (!aNoDate && !bNoDate && aEventDate !== bEventDate) {
          return aEventDate - bEventDate
        }

        const aRequestCreatedAt = getValidDateTime(a?.requestCreatedAt) ?? 0
        const bRequestCreatedAt = getValidDateTime(b?.requestCreatedAt) ?? 0
        return bRequestCreatedAt - aRequestCreatedAt
      })
    }

    const sorter = (a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0
      return dateB - dateA
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
      const completionTime = getEventCompletionTime(event)
      const nowTime = Date.now()
      const shouldBeUpcoming =
        completionTime === null || completionTime >= nowTime
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
        const now = new Date()
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

  const handleLoadMorePast = useCallback(async () => {
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
      const loadedItems = Array.isArray(response?.data) ? response.data : []
      const nextMeta = response?.meta ?? {}

      if (loadedItems.length > 0) {
        setEvents((prev) => {
          const prevIds = new Set((prev ?? []).map((item) => String(item?._id)))
          const uniqueNew = loadedItems.filter(
            (item) => !prevIds.has(String(item?._id))
          )
          return uniqueNew.length > 0 ? [...(prev ?? []), ...uniqueNew] : prev ?? []
        })
      }

      setPastHasMore(Boolean(nextMeta?.hasMore))
      setPastNextBefore(nextMeta?.nextBefore || null)
      setPastTotalCount(Number(nextMeta?.totalCount || loadedItems.length || 0))
    } finally {
      setPastLoadingMore(false)
    }
  }, [pastHasMore, pastLoadingMore, pastNextBefore, setEvents])

  const monthTitle = useMemo(
    () =>
      monthCursor.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    [monthCursor]
  )

  const monthGridDays = useMemo(() => {
    const monthStart = toMonthStart(monthCursor)
    const shift = monthStart.getDay()
    const gridStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1 - shift
    )
    return Array.from({ length: MONTH_VIEW_DAY_CELLS }, (_, index) => {
      const day = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      )
      return {
        date: day,
        key: toDateKey(day),
        inCurrentMonth: day.getMonth() === monthStart.getMonth(),
      }
    })
  }, [monthCursor])

  const monthItemsByDay = useMemo(() => {
    const map = new Map()
    sortedEvents.forEach((event) => {
      const pushByDate = (dateValue, payload) => {
        const dayKey = toDateKey(dateValue)
        if (!dayKey) return
        if (!map.has(dayKey)) map.set(dayKey, [])
        map.get(dayKey).push(payload)
      }

      pushByDate(event?.eventDate, {
        type: 'event',
        eventId: event?._id,
        title: event?.eventType || 'Мероприятие',
        status: event?.status || 'active',
        time: toMinuteOfDay(event?.eventDate),
      })

      ;(Array.isArray(event?.additionalEvents) ? event.additionalEvents : []).forEach(
        (item, index) => {
          pushByDate(item?.date, {
            type: 'additional',
            eventId: event?._id,
            title: item?.title || `Доп. событие #${index + 1}`,
            status: item?.done ? 'done' : 'active',
            done: Boolean(item?.done),
            time: toMinuteOfDay(item?.date),
          })
        }
      )
    })

    map.forEach((items, key) => {
      map.set(
        key,
        [...items].sort((a, b) => {
          if (a.time !== b.time) return a.time - b.time
          if (a.type === b.type) return 0
          return a.type === 'event' ? -1 : 1
        })
      )
    })
    return map
  }, [sortedEvents])

  const monthEventsByDay = useMemo(() => {
    const map = new Map()
    sortedEvents.forEach((event) => {
      const dayKey = toDateKey(event?.eventDate)
      if (!dayKey) return
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey).push(event)
    })
    map.forEach((items, key) => {
      map.set(
        key,
        [...items].sort((a, b) => {
          const aTime = new Date(a?.eventDate ?? 0).getTime()
          const bTime = new Date(b?.eventDate ?? 0).getTime()
          return aTime - bTime
        })
      )
    })
    return map
  }, [sortedEvents])

  const monthMeta = useMemo(() => {
    const meta = { events: 0, additional: 0 }
    monthGridDays.forEach((day) => {
      if (!day.inCurrentMonth) return
      const dayItems = monthItemsByDay.get(day.key) || []
      dayItems.forEach((item) => {
        if (item.type === 'event') meta.events += 1
        else meta.additional += 1
      })
    })
    return meta
  }, [monthGridDays, monthItemsByDay])

  useEffect(() => {
    if (viewMode !== 'month') return
    if (sortedEvents.length === 0) return
    const hasItemsInCurrentMonth = monthGridDays.some((day) => {
      if (!day.inCurrentMonth) return false
      const items = monthItemsByDay.get(day.key)
      return Array.isArray(items) && items.length > 0
    })
    if (hasItemsInCurrentMonth) return

    const firstDate = sortedEvents[0]?.eventDate
    const parsed = firstDate ? new Date(firstDate) : null
    if (!parsed || Number.isNaN(parsed.getTime())) return
    setMonthCursor(toMonthStart(parsed))
  }, [monthGridDays, monthItemsByDay, sortedEvents, viewMode])

  const openDayEventsModal = useCallback(
    (day) => {
      const dayEvents = monthEventsByDay.get(day?.key) || []
      if (dayEvents.length === 0) return
      const dayTitle = day?.date
        ? day.date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : 'Выбранный день'

      const DayEventsModal = () => (
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-auto px-1 py-1">
          {dayEvents.map((event) => (
            <EventCard key={`month-day-event-${event._id}`} eventId={event._id} />
          ))}
        </div>
      )

      modalsFunc.add({
        title: `Мероприятия: ${dayTitle}`,
        confirmButtonName: 'Закрыть',
        onConfirm: true,
        showDecline: false,
        Children: DayEventsModal,
      })
    },
    [modalsFunc, monthEventsByDay]
  )

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
              onClick={handleLoadMorePast}
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
      pastLoadingMore,
      sortedEvents,
      handleLoadMorePast,
    ]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions
          className="tablet:flex-nowrap w-full gap-y-2"
          leftClassName="min-w-0"
          bottomClassName="w-full tablet:w-auto"
          rightClassName="ml-auto w-full justify-end tablet:w-auto"
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-0.5">
                  <AppButton
                    variant={viewMode === 'list' ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-md px-2.5"
                    onClick={() => setViewMode('list')}
                  >
                    Список
                  </AppButton>
                  <AppButton
                    variant={viewMode === 'month' ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-md px-2.5"
                    onClick={() => setViewMode('month')}
                  >
                    Месяц
                  </AppButton>
                </div>
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
                {filter === 'upcoming' ? (
                  <AppButton
                    variant="primary"
                    size="sm"
                    className="phoneH:w-auto w-full rounded-md px-4 font-semibold shadow-md"
                    onClick={() => modalsFunc.event?.upcomingOverview?.()}
                  >
                    <span className="inline-flex items-center gap-2">
                      Ближайшие события
                      {upcomingOverviewBadges.length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          {upcomingOverviewBadges.map((badge) => (
                            <span
                              key={badge.key}
                              title={badge.title}
                              className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold shadow-sm ${badge.className}`}
                            >
                              {badge.value}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </AppButton>
                ) : null}
                {filter === 'upcoming' && pastActiveClosableCount > 0 ? (
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
        {viewMode === 'list' ? (
          sortedEvents.length > 0 ? (
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
          )
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <SectionCard className="border border-gray-200 bg-white/95 p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="rounded-md px-3"
                    onClick={() =>
                      setMonthCursor((prev) =>
                        toMonthStart(
                          new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                        )
                      )
                    }
                  >
                    Назад
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="rounded-md px-3"
                    onClick={() => setMonthCursor(toMonthStart(new Date()))}
                  >
                    Сегодня
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="rounded-md px-3"
                    onClick={() =>
                      setMonthCursor((prev) =>
                        toMonthStart(
                          new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                        )
                      )
                    }
                  >
                    Вперед
                  </AppButton>
                </div>
                <div className="text-sm font-semibold text-gray-800 capitalize">
                  {monthTitle}
                </div>
                <MutedText className="text-xs">
                  Мероприятий: {monthMeta.events} | Доп. событий: {monthMeta.additional}
                </MutedText>
              </div>
            </SectionCard>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {DAYS_OF_WEEK.map((dayName) => (
                  <div
                    key={dayName}
                    className="px-2 py-1.5 text-center text-[11px] font-semibold text-gray-600"
                  >
                    {dayName}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthGridDays.map((day) => {
                  const dayItems = monthItemsByDay.get(day.key) || []
                  const dayEvents = monthEventsByDay.get(day.key) || []
                  const hasDayEvents = dayEvents.length > 0
                  const extraCount = dayItems.length > 3 ? dayItems.length - 3 : 0
                  const isToday = day.key === toDateKey(new Date())
                  return (
                    <div
                      key={day.key}
                      className={`min-h-[112px] border-r border-b border-gray-100 p-1.5 ${
                        day.inCurrentMonth ? 'bg-white' : 'bg-gray-50/70'
                      } ${hasDayEvents ? 'cursor-pointer hover:bg-blue-50/40' : ''}`}
                      onClick={() => openDayEventsModal(day)}
                    >
                      <div
                        className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-semibold ${
                          isToday
                            ? 'bg-general text-white'
                            : day.inCurrentMonth
                              ? 'text-gray-800'
                              : 'text-gray-400'
                        }`}
                      >
                        {day.date.getDate()}
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayItems.slice(0, 3).map((item, index) => (
                          <button
                            key={`${day.key}-${item.type}-${item.eventId}-${index}`}
                            type="button"
                            className={`w-full cursor-pointer truncate rounded px-1.5 py-1 text-left text-[11px] leading-tight ${
                              item.type === 'event'
                                ? item.status === 'canceled'
                                  ? 'bg-red-50 text-red-700'
                                  : item.status === 'draft'
                                    ? 'bg-gray-100 text-gray-700'
                                    : item.status === 'closed'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-blue-50 text-blue-700'
                                : item.done
                                  ? 'bg-emerald-50 text-emerald-700 line-through'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                            title={item.title}
                            onClick={(event) => {
                              event.stopPropagation()
                              modalsFunc.event?.view?.(item.eventId)
                            }}
                          >
                            {item.type === 'event' ? '● ' : '◦ '}
                            {item.title}
                          </button>
                        ))}
                        {extraCount > 0 ? (
                          <div className="px-1.5 text-[10px] text-gray-500">
                            +{extraCount} еще
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {filter === 'past' && pastHasMore ? (
              <div className="flex justify-center">
                <AppButton
                  variant="secondary"
                  size="sm"
                  className="rounded-md px-4"
                  disabled={pastLoadingMore}
                  onClick={handleLoadMorePast}
                >
                  {pastLoadingMore ? 'Загрузка...' : 'Загрузить еще прошедшие'}
                </AppButton>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default EventsContent
