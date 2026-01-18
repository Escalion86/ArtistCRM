'use client'

import { useMemo, useState } from 'react'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import Input from '@components/Input'
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
        <div className="flex items-center justify-between flex-1">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Всего: {users.length}</span>
            <Button
              name="+"
              collapsing
              className="text-lg rounded-full action-icon-button h-9 w-9"
              onClick={() => modalsFunc.user?.add()}
              disabled={!modalsFunc.user?.add}
            />
          </div>
        </div>
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
      <div className="flex-1 min-h-0 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        {filteredUsers.length > 0 ? (
          <UsersList users={filteredUsers} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Пользователи не найдены
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersContent
