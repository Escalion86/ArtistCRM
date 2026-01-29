'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { useAtomValue } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import ComboBox from '@components/ComboBox'
import Button from '@components/Button'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import SectionCard from '@components/SectionCard'
import clientsAtom from '@state/atoms/clientsAtom'
import servicesAtom from '@state/atoms/servicesAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import requestsAtom from '@state/atoms/requestsAtom'
import tariffsAtom from '@state/atoms/tariffsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { MONTHS_FULL_1 } from '@helpers/constants'
import { getUserTariffAccess } from '@helpers/tariffAccess'
import { useRouter } from 'next/navigation'
import formatAddress from '@helpers/formatAddress'
import { utils, writeFile } from 'xlsx'

const buildMonthLabel = (date) => MONTHS_FULL_1[date.getMonth()]

const getMonthKey = (date, year) =>
  `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

const StatisticsContent = () => {
  const transactions = useAtomValue(transactionsAtom)
  const events = useAtomValue(eventsAtom)
  const requests = useAtomValue(requestsAtom)
  const clients = useAtomValue(clientsAtom)
  const services = useAtomValue(servicesAtom)
  const tariffs = useAtomValue(tariffsAtom)
  const loggedUser = useAtomValue(loggedUserAtom)
  const access = getUserTariffAccess(loggedUser, tariffs)
  const router = useRouter()

  if (!access.allowStatistics) {
    return (
      <div className="flex h-full flex-col gap-4">
        <ContentHeader />
        <SectionCard className="flex min-h-0 flex-1 items-center justify-center px-4">
          <EmptyState bordered={false}>
            <div className="flex flex-col items-center gap-4 text-center text-gray-500">
              <div className="text-lg font-semibold text-gray-700">
                Статистика доступна только на расширенном тарифе
              </div>
              <Button
                name="Сменить тариф"
                onClick={() => router.push('/cabinet/tariff-select')}
              />
            </div>
          </EmptyState>
        </SectionCard>
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

  const clientsMap = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => {
      if (client?._id) map.set(client._id, client)
    })
    return map
  }, [clients])

  const servicesMap = useMemo(() => {
    const map = new Map()
    services.forEach((service) => {
      if (service?._id) map.set(service._id, service)
    })
    return map
  }, [services])

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

  const formatDateTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const resolveServicesTitles = (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return ''
    return ids
      .map((id) => servicesMap.get(id)?.title ?? id)
      .filter(Boolean)
      .join(', ')
  }

  const resolveClientName = (clientId, fallbackName) => {
    if (!clientId) return fallbackName || ''
    const client = clientsMap.get(clientId)
    if (!client) return fallbackName || String(clientId)
    return (
      [client.firstName, client.secondName].filter(Boolean).join(' ') ||
      String(clientId)
    )
  }

  const resolveClientPhone = (clientId, fallbackPhone) => {
    if (fallbackPhone) return fallbackPhone
    const client = clientId ? clientsMap.get(clientId) : null
    return client?.phone ? `+${client.phone}` : ''
  }

  const resolveEventTitle = (event) => {
    if (!event) return ''
    const servicesTitle = resolveServicesTitles(event.servicesIds)
    const addressLine = formatAddress(event.address, '')
    return [servicesTitle, addressLine].filter(Boolean).join(' • ')
  }

  const buildEventFinanceMap = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      const eventId = event?._id
      if (!eventId) return
      map.set(eventId, { income: 0, expense: 0 })
    })
    transactions.forEach((tx) => {
      if (!tx?.eventId) return
      const existing = map.get(tx.eventId)
      if (!existing) return
      if (tx.type === 'income') existing.income += Number(tx.amount ?? 0)
      if (tx.type === 'expense') existing.expense += Number(tx.amount ?? 0)
    })
    return map
  }, [events, transactions])

  const handleExport = useCallback(() => {
    const yearFilter = selectedYear
    const isInYear = (value) => {
      if (!yearFilter) return true
      if (!value) return false
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return false
      return date.getFullYear() === Number(yearFilter)
    }

    const eventsRows = events
      .filter((event) => isInYear(event?.eventDate))
      .map((event) => {
        const finance = buildEventFinanceMap.get(event._id) || {
          income: 0,
          expense: 0,
        }
        const profit = finance.income - finance.expense
        return {
          ID: event._id,
          'Дата начала': formatDateTime(event.eventDate),
          'Дата окончания': formatDateTime(event.dateEnd),
          Клиент: resolveClientName(event.clientId),
          Город: event?.address?.town ?? '',
          Адрес: formatAddress(event.address, ''),
          Услуги: resolveServicesTitles(event.servicesIds),
          Статус: event.status ?? '',
          'Договорная сумма': Number(event.contractSum ?? 0),
          Доход: finance.income,
          Расход: finance.expense,
          Прибыль: profit,
        }
      })

    const requestsRows = requests
      .filter((request) =>
        isInYear(request?.eventDate ?? request?.createdAt)
      )
      .map((request) => ({
        ID: request._id,
        'Дата заявки': formatDateTime(request.createdAt),
        'Дата мероприятия': formatDateTime(request.eventDate),
        Клиент: resolveClientName(request.clientId, request.clientName),
        Телефон: resolveClientPhone(request.clientId, request.clientPhone),
        Город: request?.address?.town ?? '',
        Адрес: formatAddress(request.address, ''),
        Услуги: resolveServicesTitles(request.servicesIds),
        Статус: request.status ?? '',
        'Договорная сумма': Number(request.contractSum ?? 0),
        'Связано с мероприятием': request.eventId ? 'Да' : 'Нет',
      }))

    const transactionsRows = transactions
      .filter((tx) => isInYear(tx?.date))
      .map((tx) => {
        const event = eventsMap.get(tx.eventId)
        return {
          ID: tx._id,
          Дата: formatDateTime(tx.date),
          Тип: tx.type ?? '',
          Категория: tx.category ?? '',
          Сумма: Number(tx.amount ?? 0),
          Клиент: resolveClientName(tx.clientId),
          Мероприятие: resolveEventTitle(event),
          Комментарий: tx.comment ?? '',
        }
      })

    const workbook = utils.book_new()
    utils.book_append_sheet(
      workbook,
      utils.json_to_sheet(eventsRows),
      'Мероприятия'
    )
    utils.book_append_sheet(
      workbook,
      utils.json_to_sheet(requestsRows),
      'Заявки'
    )
    utils.book_append_sheet(
      workbook,
      utils.json_to_sheet(transactionsRows),
      'Транзакции'
    )

    const fileSuffix = yearFilter ? String(yearFilter) : 'all'
    writeFile(workbook, `artistcrm-export-${fileSuffix}.xlsx`)
  }, [
    buildEventFinanceMap,
    events,
    eventsMap,
    requests,
    transactions,
    selectedYear,
    resolveClientName,
    resolveClientPhone,
    resolveEventTitle,
    resolveServicesTitles,
  ])

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions
          left={
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
          }
          right={
            <Button name="Экспорт Excel" onClick={handleExport} />
          }
        />
      </ContentHeader>

      <SectionCard className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-600" />
            <span>Прибыль</span>
          </div>
        </div>
        {stats.length === 0 ? (
          <EmptyState
            bordered={false}
            text={
              selectedYear
                ? 'Нет данных для статистики'
                : 'Нет данных для выбранного года'
            }
          />
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
      </SectionCard>
    </div>
  )
}

export default StatisticsContent
