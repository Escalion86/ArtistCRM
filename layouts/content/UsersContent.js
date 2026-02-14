'use client'

import { useMemo, useState } from 'react'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import Input from '@components/Input'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import UsersList from '@layouts/lists/UsersList'
import usersAtom from '@state/atoms/usersAtom'
import { modalsFuncAtom } from '@state/atoms'
import { useAtomValue } from 'jotai'

const UsersContent = () => {
  const users = useAtomValue(usersAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    return [...users]
      .filter((user) => {
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
      })
      .sort((a, b) => {
        const lastNameCompare = (a.secondName || '').localeCompare(
          b.secondName || '',
          'ru'
        )
        if (lastNameCompare !== 0) return lastNameCompare
        return (a.firstName || '').localeCompare(b.firstName || '', 'ru')
      })
  }, [search, users])

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {users.length}</MutedText>
              <Button
                name="+"
                collapsing
                className="action-icon-button action-icon-button--neutral h-9 w-9 rounded-full text-lg"
                onClick={() => modalsFunc.user?.add()}
                disabled={!modalsFunc.user?.add}
              />
            </>
          }
        />
      </ContentHeader>
      <div className="p-2">
        <Input
          label="Поиск пользователя"
          value={search}
          onChange={setSearch}
          placeholder="Введите имя, телефон или контакт"
          noMargin
        />
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
