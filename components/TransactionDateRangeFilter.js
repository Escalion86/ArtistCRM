'use client'

import cn from 'classnames'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import {
  buildMonthDays,
  calculateDateRangePanelPosition,
  formatDateRangeLabel,
  getNextWeekendRange,
  isDateInRange,
  isDateRangeEdge,
  MONTHS_FULL,
  normalizeRangeByDate,
  toDateInputValue,
  WEEKDAY_LABELS,
} from '@helpers/transactionDateRange'

const EMPTY_RANGE = { from: '', to: '' }

const buildInitialCursorDate = (value) => {
  const selectedKey = value?.from || toDateInputValue(new Date())
  const [year, month] = selectedKey.split('-').map(Number)
  if (year && month) {
    return new Date(year, month - 1, 1)
  }
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

const TransactionDateRangeFilter = ({
  value = EMPTY_RANGE,
  onChange,
  activeDateKeys,
}) => {
  const [open, setOpen] = useState(false)
  const [draftRange, setDraftRange] = useState(value)
  const [cursorDate, setCursorDate] = useState(() =>
    buildInitialCursorDate(value)
  )
  const [panelPosition, setPanelPosition] = useState(null)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  const updatePanelPosition = useCallback(() => {
    if (typeof window === 'undefined' || !buttonRef.current) return
    setPanelPosition(
      calculateDateRangePanelPosition({
        buttonRect: buttonRef.current.getBoundingClientRect(),
        viewportWidth: window.innerWidth,
      })
    )
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const onClickOutside = (event) => {
      const target = event.target
      const clickedPanel = panelRef.current && panelRef.current.contains(target)
      const clickedButton =
        buttonRef.current && buttonRef.current.contains(target)
      if (!clickedPanel && !clickedButton) setOpen(false)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [open, updatePanelPosition])

  const calendarDays = useMemo(() => buildMonthDays(cursorDate), [cursorDate])
  const monthLabel = `${MONTHS_FULL[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`
  const active = Boolean(value?.from)
  const buttonLabel = formatDateRangeLabel(value)
  const draftLabel = draftRange?.from
    ? formatDateRangeLabel(draftRange)
    : 'Выберите дату или диапазон'

  const toggleOpen = () => {
    setOpen((state) => {
      if (!state) {
        setDraftRange(value)
        setCursorDate(buildInitialCursorDate(value))
        updatePanelPosition()
      }
      return !state
    })
  }

  const applyRange = () => {
    onChange?.(draftRange)
    setOpen(false)
  }

  const resetRange = () => {
    setDraftRange(EMPTY_RANGE)
    onChange?.(EMPTY_RANGE)
    setOpen(false)
  }

  const setToday = () => {
    const today = toDateInputValue(new Date())
    setDraftRange({ from: today, to: today })
  }

  const setTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const value = toDateInputValue(tomorrow)
    setDraftRange({ from: value, to: value })
  }

  const calendarPanel = (
    <div
      ref={panelRef}
      style={{
        left: panelPosition?.left ?? 12,
        top: panelPosition?.top ?? 48,
        width: panelPosition?.width ?? 'calc(100vw - 1.5rem)',
      }}
      className="tablet:p-4 fixed z-50 max-h-[calc(100dvh-5rem)] origin-top overflow-y-auto rounded-2xl border border-[var(--surface-toolbar-border)] bg-white p-3 shadow-[0_18px_36px_rgba(17,24,39,0.14)] transition-all duration-150"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-base leading-5 font-bold text-gray-900">
          {draftLabel}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ui-secondary-border)] text-lg text-[var(--ui-primary)] hover:bg-[var(--ui-primary)]/10"
            onClick={() =>
              setCursorDate(
                (state) =>
                  new Date(state.getFullYear(), state.getMonth() - 1, 1)
              )
            }
          >
            ←
          </button>
          <div className="min-w-[120px] text-center text-sm font-bold tracking-[0.08em] text-gray-900 uppercase">
            {monthLabel}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ui-secondary-border)] text-lg text-[var(--ui-primary)] hover:bg-[var(--ui-primary)]/10"
            onClick={() =>
              setCursorDate(
                (state) =>
                  new Date(state.getFullYear(), state.getMonth() + 1, 1)
              )
            }
          >
            →
          </button>
        </div>
      </div>

      <div className="tablet:gap-2 mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="rounded-lg bg-[rgba(125,100,53,0.10)] py-2 text-center text-xs font-semibold text-[var(--ui-primary)]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="tablet:gap-2 grid grid-cols-7 gap-1.5">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="h-10 rounded-lg border border-transparent"
              />
            )
          }

          const date = new Date(
            cursorDate.getFullYear(),
            cursorDate.getMonth(),
            day
          )
          const key = toDateInputValue(date)
          const selected = isDateInRange(date, draftRange)
          const edge = isDateRangeEdge(date, draftRange)
          const hasTransactions = activeDateKeys?.has(key)

          return (
            <button
              key={`${cursorDate.getFullYear()}-${cursorDate.getMonth()}-${day}`}
              type="button"
              onClick={() =>
                setDraftRange((state) => normalizeRangeByDate(state, date))
              }
              className={cn(
                'flex h-10 w-full items-center justify-center rounded-lg border text-sm transition-colors',
                selected
                  ? 'border-[var(--ui-primary)] bg-[rgba(125,100,53,0.72)] text-white'
                  : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200',
                edge &&
                  'border-[var(--ui-primary)] bg-[var(--ui-primary)] font-bold text-[var(--ui-primary-text)]',
                !selected &&
                  hasTransactions &&
                  'border-[rgba(37,99,235,0.35)] bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
          onClick={setToday}
        >
          Сегодня
        </button>
        <button
          type="button"
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
          onClick={setTomorrow}
        >
          Завтра
        </button>
        <button
          type="button"
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
          onClick={() => setDraftRange(getNextWeekendRange())}
        >
          В выходные
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
            onClick={resetRange}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--ui-primary)] px-6 py-2 text-sm font-semibold text-[var(--ui-primary-text)] hover:bg-[var(--ui-primary-hover)]"
            onClick={applyRange}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          'filter-control min-w-[104px]',
          active
            ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)] text-[var(--ui-primary-text)] hover:bg-[var(--ui-primary-hover)]'
            : 'border-[var(--ui-secondary-border)] bg-[var(--ui-secondary-bg)] text-[var(--ui-secondary-text)] hover:border-[var(--ui-secondary-hover-border)] hover:bg-[var(--ui-secondary-hover-bg)] hover:text-[var(--ui-secondary-hover-text)]'
        )}
        onClick={toggleOpen}
      >
        <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
        {buttonLabel}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(calendarPanel, document.body)
        : null}
    </div>
  )
}

export default TransactionDateRangeFilter
