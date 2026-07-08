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

const UsersContent = () => {
  const { data: users = [] } = useUsersQuery()
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState(USER_SORT_MODES.NAME)

  const filteredUsers = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    return sortUsers(
      users.filter((user) => {
        if (!lowerSearch) return true
        return [
          user.firstName,
          user.secondName,
          user.thirdName,
          user.phone ? `+${user.phone}` : '',
          user.telegram ? `@${user.telegram}` : '',
          user.email,
        ]
          .join(' ')
          .toLowerCase()
          .includes(lowerSearch)
      }),
      sortMode
    )
  }, [search, sortMode, users])

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
      <div className="grid gap-2 p-2 tablet:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          label="Поиск пользователя"
          value={search}
          onChange={setSearch}
          placeholder="Введите имя, телефон или контакт"
          noMargin
        />
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
