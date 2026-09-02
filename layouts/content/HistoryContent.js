'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import HistoryFeed from '@components/HistoryFeed'
import Notice from '@components/Notice'
import { modalsFuncAtom } from '@state/atoms'
import { useUsersQuery } from '@helpers/useEntityQueries'

const ENTITY_OPTIONS = [
  ['', 'Все карточки'], ['event', 'Заявки и мероприятия'], ['client', 'Клиенты'], ['transaction', 'Финансы'],
]
const OPERATION_OPTIONS = [
  ['', 'Все действия'], ['create', 'Добавление'], ['update', 'Изменение'], ['delete', 'Удаление'], ['merge', 'Объединение'],
]
const SOURCE_OPTIONS = [
  ['', 'Все источники'], ['web', 'Web'], ['android', 'Android'], ['public_api', 'Public API'],
  ['tilda', 'Tilda'], ['google_import', 'Google Calendar'], ['avito', 'Avito'], ['vk', 'VK'], ['telephony', 'Телефония'],
  ['file_import', 'Импорт из файла'],
]

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-medium">
    {label}
    <select className="ui-input min-h-10 cursor-pointer rounded-lg border px-3" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  </label>
)

const HistoryContent = () => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [entityType, setEntityType] = useState('')
  const [operation, setOperation] = useState('')
  const [source, setSource] = useState('')
  const [actorId, setActorId] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const { data: users = [] } = useUsersQuery()
  const actorOptions = useMemo(
    () => [
      ['', 'Все авторы'],
      ...users.map((user) => [
        String(user._id),
        [user.firstName, user.secondName].filter(Boolean).join(' ') || user.phone || 'Пользователь',
      ]),
    ],
    [users]
  )
  const filters = useMemo(() => ({
    entityType, operation, source, actorId, search: deferredSearch, dateFrom,
    dateTo: dateTo ? `${dateTo}T23:59:59.999` : '', limit: 30,
  }), [actorId, dateFrom, dateTo, deferredSearch, entityType, operation, source])

  const openItem = (item) => {
    if (item.entityType === 'event') modalsFunc.event?.view(item.entityId)
    if (item.entityType === 'client') modalsFunc.client?.view(item.entityId)
    if (item.entityType === 'transaction') modalsFunc.transaction?.edit(null, item.entityId)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 laptop:p-4">
      <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[220px] flex-[2] flex-col gap-1 text-xs font-medium">
            Поиск
            <input className="ui-input min-h-10 rounded-lg border px-3" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Карточка или пользователь" />
          </label>
          <FilterSelect label="Карточки" value={entityType} onChange={setEntityType} options={ENTITY_OPTIONS} />
          <FilterSelect label="Действия" value={operation} onChange={setOperation} options={OPERATION_OPTIONS} />
          <FilterSelect label="Источник" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
          <FilterSelect label="Автор" value={actorId} onChange={setActorId} options={actorOptions} />
          <label className="flex min-w-[145px] flex-1 flex-col gap-1 text-xs font-medium">С даты<input type="date" className="ui-input min-h-10 cursor-pointer rounded-lg border px-3" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="flex min-w-[145px] flex-1 flex-col gap-1 text-xs font-medium">По дату<input type="date" className="ui-input min-h-10 cursor-pointer rounded-lg border px-3" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        </div>
      </div>
      <Notice tone="info" className="shrink-0 text-sm">История до даты обновления могла сохраниться не полностью.</Notice>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <HistoryFeed filters={filters} onOpenItem={openItem} />
      </div>
    </div>
  )
}

export default HistoryContent
