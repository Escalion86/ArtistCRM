'use client'

import { useMemo, useState, useEffect } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { useAtomValue } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import ComboBox from '@components/ComboBox'
import Button from '@components/Button'
import transactionsAtom from '@state/atoms/transactionsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import tariffsAtom from '@state/atoms/tariffsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { MONTHS_FULL_1 } from '@helpers/constants'
import { getUserTariffAccess } from '@helpers/tariffAccess'
import { useRouter } from 'next/navigation'

const buildMonthLabel = (date) => MONTHS_FULL_1[date.getMonth()]

const getMonthKey = (date, year) =>
  `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

const StatisticsContent = () => {
  const transactions = useAtomValue(transactionsAtom)
  const events = useAtomValue(eventsAtom)
  const tariffs = useAtomValue(tariffsAtom)
  const loggedUser = useAtomValue(loggedUserAtom)
  const access = getUserTariffAccess(loggedUser, tariffs)
  const router = useRouter()

  if (!access.allowStatistics) {
    return (
      <div className="flex h-full flex-col gap-4">
        <ContentHeader />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white px-4 text-gray-500">
          <div className="text-center text-lg font-semibold text-gray-700">
            Статистика доступна только на расширенном тарифе
          </div>
          <Button
            name="Сменить тариф"
            onClick={() => router.push('/cabinet/tariff-select')}
          />
        </div>
      </div>
    )
  }

  const eventsMap = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      if (event?._id) map.set(event._id, event)
    })
    return map
  }, [events])

  const availableYears = useMemo(() => {
    const years = new Set()
    events.forEach((event) => {
      if (!event?.eventDate) return
      const date = new Date(event.eventDate)
      if (Number.isNaN(date.getTime())) return
      years.add(date.getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [events])

  const [selectedYear, setSelectedYear] = useState(null)

  useEffect(() => {
    if (selectedYear !== null) return
    if (availableYears.length > 0) setSelectedYear(availableYears[0])
  }, [availableYears, selectedYear])

  const stats = useMemo(() => {
    if (!selectedYear) return []
    const byMonth = new Map()
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const isFutureMonth = (monthIndex) =>
      selectedYear > currentYear ||
      (selectedYear === currentYear && monthIndex > currentMonth)

    events.forEach((event) => {
      if (event?.status === 'canceled') return
      if (!event?.eventDate) return
      const date = new Date(event.eventDate)
      if (Number.isNaN(date.getTime())) return
      if (date.getFullYear() !== selectedYear) return

      const key = getMonthKey(date, selectedYear)
      const label = buildMonthLabel(date)
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          month: label,
          income: 0,
          expense: 0,
          profit: 0,
          isFuture: isFutureMonth(date.getMonth()),
          plannedIncome: 0,
        })
      }
      const bucket = byMonth.get(key)
      if (bucket.isFuture) {
        const amount = Number(event.contractSum ?? 0)
        bucket.plannedIncome += Number.isFinite(amount) ? amount : 0
      }
    })

    transactions.forEach((transaction) => {
      if (!transaction?.eventId) return
      const dateRaw =
        transaction.date ?? eventsMap.get(transaction.eventId)?.eventDate
      if (!dateRaw) return
      const date = new Date(dateRaw)
      if (Number.isNaN(date.getTime())) return

      if (date.getFullYear() !== selectedYear) return
      const key = getMonthKey(date, selectedYear)
      const label = buildMonthLabel(date)
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          month: label,
          income: 0,
          expense: 0,
          profit: 0,
          isFuture: isFutureMonth(date.getMonth()),
          plannedIncome: 0,
        })
      }
      const bucket = byMonth.get(key)
      if (bucket.isFuture) return
      const amount = Number(transaction.amount ?? 0)
      if (transaction.type === 'income') bucket.income += amount
      if (transaction.type === 'expense') bucket.expense += amount
      bucket.profit = bucket.income - bucket.expense
    })

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => {
        if (value.isFuture) {
          const planned = Number(value.plannedIncome ?? 0)
          return {
            ...value,
            profit: planned,
          }
        }
        return value
      })
  }, [events, eventsMap, selectedYear, transactions])

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <div className="flex flex-1 items-center justify-between">
          <div className="w-52">
            <ComboBox
              label="Год"
              items={availableYears}
              value={selectedYear}
              onChange={(value) =>
                setSelectedYear(value !== null ? Number(value) : null)
              }
              placeholder="Выберите год"
              fullWidth
              noMargin
            />
          </div>
          <div />
        </div>
      </ContentHeader>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-600" />
            <span>Прибыль</span>
          </div>
        </div>
        {stats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            {selectedYear
              ? 'Нет данных для статистики'
              : 'Нет данных для выбранного года'}
          </div>
        ) : (
          <div className="h-full min-h-[320px]">
            <ResponsiveBar
              data={stats}
              keys={['profit']}
              indexBy="month"
              margin={{ top: 20, right: 20, bottom: 60, left: 70 }}
              padding={0.2}
              colors={['#2563eb']}
              defs={[
                {
                  id: 'futurePattern',
                  type: 'patternLines',
                  background: 'inherit',
                  color: 'rgba(0,0,0,0.25)',
                  rotation: -45,
                  lineWidth: 4,
                  spacing: 6,
                },
              ]}
              fill={[
                {
                  match: (d) => d.data.isFuture === true,
                  id: 'futurePattern',
                },
              ]}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -20,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                legend: 'Сумма, руб.',
                legendPosition: 'middle',
                legendOffset: -55,
              }}
              enableLabel={false}
              groupMode="grouped"
              valueFormat={(value) => value.toLocaleString('ru-RU')}
              tooltip={({ id, value, indexValue }) => (
                <div className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow">
                  <div className="font-semibold">{indexValue}</div>
                  <div>
                    {id === 'profit' ? 'Прибыль' : id}:{' '}
                    {Number(value).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              )}
              theme={{
                text: { fontSize: 12, fill: '#374151' },
                axis: {
                  legend: { text: { fontSize: 12, fill: '#374151' } },
                  ticks: {
                    text: { fontSize: 11, fill: '#6b7280' },
                  },
                },
                grid: {
                  line: { stroke: '#e5e7eb', strokeWidth: 1 },
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatisticsContent
