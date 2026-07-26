'use client'

import { useMemo, useState } from 'react'
import ContentHeader from '@components/ContentHeader'
import AddIconButton from '@components/AddIconButton'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import Input from '@components/Input'
import MutedText from '@components/MutedText'
import NativeSelect from '@components/NativeSelect'
import SectionCard from '@components/SectionCard'
import UsersList from '@layouts/lists/UsersList'
import { modalsFuncAtom } from '@state/atoms'
import { useAtomValue } from 'jotai'
import { useUsersQuery } from '@helpers/useEntityQueries'
import {
  sortUsers,
  USER_SORT_MODES,
  USER_SORT_OPTIONS,
} from '@helpers/usersSort'
import { formatRegistrationSource } from '@helpers/registrationSource.mjs'

const ALL_SOURCES = '__all__'
const EMPTY_SOURCE = '__empty__'

const formatPercent = (value, total) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '—'

const funnelSteps = [
  ['Регистрации', 'registered'],
  ['Запрос демо', 'demoRequested'],
  ['Onboarding', 'onboarding'],
  ['Первая заявка', 'firstItem'],
  ['Возврат W1', 'returned'],
  ['Активированы', 'activated'],
  ['Оплатили', 'paid'],
]

const UsersContent = () => {
  const { data: users = [] } = useUsersQuery()
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState(USER_SORT_MODES.NAME)
  const [sourceFilter, setSourceFilter] = useState(ALL_SOURCES)

  const sourceStats = useMemo(() => {
    const counts = new Map()
    users.forEach((user) => {
      const source =
        user.registrationSource || user.acquisition?.source || EMPTY_SOURCE
      const current = counts.get(source) ?? {
        source,
        registered: 0,
        demoRequested: 0,
        onboarding: 0,
        firstItem: 0,
        returned: 0,
        activated: 0,
        paid: 0,
      }
      current.registered += 1
      if (user.acquisitionFunnel?.pilotDemoRequestedAt) current.demoRequested += 1
      if (user.acquisitionFunnel?.onboardingCompletedAt) current.onboarding += 1
      if (user.acquisitionFunnel?.firstCrmItemCreatedAt) current.firstItem += 1
      if (user.acquisitionFunnel?.returnedWithin7DaysAt) current.returned += 1
      if (user.acquisitionFunnel?.activatedAt) current.activated += 1
      if (user.acquisitionFunnel?.paymentSucceededAt) current.paid += 1
      counts.set(source, current)
    })
    return Array.from(counts.values()).sort(
      (left, right) => right.registered - left.registered
    )
  }, [users])

  const funnelTotals = useMemo(
    () =>
      sourceStats.reduce(
        (totals, source) => {
          funnelSteps.forEach(([, key]) => {
            totals[key] += source[key]
          })
          return totals
        },
        {
          registered: 0,
          demoRequested: 0,
          onboarding: 0,
          firstItem: 0,
          returned: 0,
          activated: 0,
          paid: 0,
        }
      ),
    [sourceStats]
  )

  const filteredUsers = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    return sortUsers(
      users.filter((user) => {
        const userSource =
          user.registrationSource || user.acquisition?.source || EMPTY_SOURCE
        if (sourceFilter !== ALL_SOURCES && userSource !== sourceFilter) {
          return false
        }
        if (!lowerSearch) return true
        return [
          user.firstName,
          user.secondName,
          user.thirdName,
          user.phone ? `+${user.phone}` : '',
          user.telegram ? `@${user.telegram}` : '',
          user.email,
          user.registrationSource,
          user.acquisition?.source,
          user.acquisition?.campaign,
        ]
          .join(' ')
          .toLowerCase()
          .includes(lowerSearch)
      }),
      sortMode
    )
  }, [search, sortMode, sourceFilter, users])

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {users.length}</MutedText>
              <AddIconButton
                onClick={() => modalsFunc.user?.add()}
                disabled={!modalsFunc.user?.add}
                title="Добавить пользователя"
                size="sm"
                variant="neutral"
              />
            </>
          }
        />
      </ContentHeader>
      <div className="grid gap-2 p-2 tablet:grid-cols-[minmax(0,1fr)_200px_220px]">
        <Input
          label="Поиск пользователя"
          value={search}
          onChange={setSearch}
          placeholder="Введите имя, телефон или контакт"
          noMargin
        />
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
          Источник регистрации
          <NativeSelect
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-9 w-full cursor-pointer rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
            arrowClassName="right-3"
          >
            <option value={ALL_SOURCES}>Все источники ({users.length})</option>
            {sourceStats.map(({ source, registered }) => (
              <option key={source} value={source}>
                {source === EMPTY_SOURCE
                  ? `Без метки (${registered})`
                  : `${formatRegistrationSource(source)} (${registered})`}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
          Сортировка
          <NativeSelect
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="h-9 w-full cursor-pointer rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
            arrowClassName="right-3"
          >
            {USER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      {sourceStats.length > 0 ? (
        <div className="grid gap-3 px-2 pb-2">
          <div className="grid grid-cols-2 gap-2 tablet:grid-cols-3 desktop:grid-cols-7">
            {funnelSteps.map(([label, key]) => (
              <div
                key={key}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="text-xs font-semibold text-gray-500">{label}</div>
                <div className="mt-1 text-xl font-semibold text-gray-900">
                  {funnelTotals[key]}
                </div>
                {key !== 'registered' ? (
                  <div className="text-xs text-gray-500">
                    {formatPercent(funnelTotals[key], funnelTotals.registered)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-[720px] w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2">Источник</th>
                  {funnelSteps.map(([label, key]) => (
                    <th key={key} className="px-3 py-2">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sourceStats.map((source) => (
                  <tr key={source.source} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {source.source === EMPTY_SOURCE
                        ? 'Без метки'
                        : formatRegistrationSource(source.source)}
                    </td>
                    {funnelSteps.map(([, key]) => (
                      <td key={key} className="px-3 py-2 text-gray-700">
                        {source[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <SectionCard className="flex-1 min-h-0 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <UsersList users={filteredUsers} />
        ) : (
          <EmptyState text="Пользователи не найдены" bordered={false} />
        )}
      </SectionCard>
    </div>
  )
}

export default UsersContent
