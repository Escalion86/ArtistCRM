'use client'

import { useMemo, useState, useCallback } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList as List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import Input from '@components/Input'
import UserCard from '@layouts/cards/UserCard'
import usersAtom from '@state/atoms/usersAtom'
import { modalsFuncAtom } from '@state/atoms'
import { useAtomValue } from 'jotai'

const ITEM_HEIGHT = 101

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

  const renderRow = useCallback(
    ({ index, style }) => {
      const user = filteredUsers[index]
      return <UserCard style={style} userId={user._id} />
    },
    [filteredUsers]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <div className="flex flex-1 items-center justify-between">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Всего: {users.length}</span>
            <Button
              name="+"
              collapsing
              className="action-icon-button h-9 w-9 rounded-full text-lg"
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
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredUsers.length > 0 ? (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredUsers.length}
                itemSize={ITEM_HEIGHT}
                itemKey={(index) => filteredUsers[index]?._id ?? index}
              >
                {renderRow}
              </List>
            )}
          </AutoSizer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Пользователи не найдены
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersContent
