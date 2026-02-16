import { useEffect, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import clientSelector from '@state/selectors/clientSelector'
import eventsAtom from '@state/atoms/eventsAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import { modalsFuncAtom } from '@state/atoms'
import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import getPersonFullName from '@helpers/getPersonFullName'

const CardButtonsComponent = ({ client, onEdit }) => (
  <CardButtons
    item={client}
    typeOfItem="client"
    minimalActions
    alwaysCompact
    onEdit={onEdit}
    dropDownPlacement="left"
  />
)

const clientViewFunc = (clientId) => {
  const ClientViewModal = ({ setTopLeftComponent }) => {
    const client = useAtomValue(clientSelector(clientId))
    const events = useAtomValue(eventsAtom)
    const transactions = useAtomValue(transactionsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)

    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()

    const clientEvents = useMemo(() => {
      if (!clientId) return []
      return events.filter((event) => event.clientId === clientId)
    }, [events])

    const canceledCount = clientEvents.filter(
      (event) => event.status === 'canceled'
    ).length

    const passedCount = clientEvents.filter((event) => {
      if (event.status === 'canceled') return false
      if (!event.eventDate) return false
      return new Date(event.eventDate).getTime() < startOfToday
    }).length

    const upcomingCount =
      clientEvents.filter((event) => {
        if (event.status === 'canceled') return false
        if (!event.eventDate) return true
        return new Date(event.eventDate).getTime() >= startOfToday
      }).length

    const clientTransactions = useMemo(() => {
      if (!clientId) return []
      return (transactions ?? []).filter(
        (transaction) => transaction.clientId === clientId
      )
    }, [transactions])

    const incomeTotal = clientTransactions.reduce(
      (total, item) =>
        item.type === 'income' ? total + (item.amount ?? 0) : total,
      0
    )
    const expenseTotal = clientTransactions.reduce(
      (total, item) =>
        item.type === 'expense' ? total + (item.amount ?? 0) : total,
      0
    )
    const balanceTotal = incomeTotal - expenseTotal
    const requisitesLines = useMemo(() => {
      if (!client) return []
      const rows = []
      if (client.legalName) rows.push(`Наименование: ${client.legalName}`)
      if (client.inn) rows.push(`ИНН: ${client.inn}`)
      if (client.kpp) rows.push(`КПП: ${client.kpp}`)
      if (client.ogrn) rows.push(`ОГРН/ОГРНИП: ${client.ogrn}`)
      if (client.bankName) rows.push(`Банк: ${client.bankName}`)
      if (client.bik) rows.push(`БИК: ${client.bik}`)
      if (client.checkingAccount)
        rows.push(`Расчетный счет: ${client.checkingAccount}`)
      if (client.correspondentAccount)
        rows.push(`Корр. счет: ${client.correspondentAccount}`)
      if (client.legalAddress) rows.push(`Юридический адрес: ${client.legalAddress}`)
      return rows
    }, [client])

    useEffect(() => {
      if (setTopLeftComponent)
        setTopLeftComponent(() => (
          <CardButtonsComponent
            client={client}
            onEdit={() => modalsFunc.client?.edit(clientId)}
          />
        ))
    }, [client, modalsFunc.client, setTopLeftComponent])

    if (!clientId || !client)
      return (
        <div className="flex justify-center w-full text-lg ">
          ОШИБКА! Клиент не найден!
        </div>
      )

    return (
      <div className="flex flex-col gap-4 text-sm text-gray-800">
        <div className="relative p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {getPersonFullName(client, { fallback: 'Без имени' })}
          </div>
          {!setTopLeftComponent && (
            <div className="absolute right-4 top-4">
              <CardButtonsComponent
                client={client}
                onEdit={() => modalsFunc.client?.edit(clientId)}
              />
            </div>
          )}
          <div className="mt-1 text-gray-600">
            {client.phone ? `+${client.phone}` : 'Телефон не указан'}
          </div>
          <div className="mt-2">
            <ContactsIconsButtons user={client} />
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              Мероприятия
            </div>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-blue-600 transition border border-blue-600 rounded cursor-pointer bg-blue-50 hover:bg-blue-100"
              onClick={() => modalsFunc.client?.events(clientId)}
            >
              Посмотреть мероприятия
            </button>
          </div>
          <div className="grid gap-2 mt-2 text-sm text-gray-700 tablet:grid-cols-3">
            <div>
              Прошли: <span className="font-semibold">{passedCount}</span>
            </div>
            <div>
              Будут: <span className="font-semibold">{upcomingCount}</span>
            </div>
            <div>
              Отменены: <span className="font-semibold">{canceledCount}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              Финансы по транзакциям
            </div>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-blue-600 transition border border-blue-600 rounded cursor-pointer bg-blue-50 hover:bg-blue-100"
              onClick={() => modalsFunc.client?.transactions(clientId)}
            >
              Показать транзакции
            </button>
          </div>
          <div className="grid gap-2 mt-2 text-sm text-gray-700 tablet:grid-cols-3">
            <div>
              Доходы:{' '}
              <span className="font-semibold text-emerald-700">
                {incomeTotal.toLocaleString()} ₽
              </span>
            </div>
            <div>
              Расходы:{' '}
              <span className="font-semibold text-red-700">
                {expenseTotal.toLocaleString()} ₽
              </span>
            </div>
            <div>
              Итог:{' '}
              <span className="font-semibold text-gray-900">
                {balanceTotal.toLocaleString()} ₽
              </span>
            </div>
          </div>
        </div>
        {requisitesLines.length > 0 && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm font-semibold text-gray-900">Реквизиты</div>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {requisitesLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return {
    title: 'Клиент',
    confirmButtonName: 'Закрыть',
    showDecline: false,
    onConfirm: true,
    Children: ClientViewModal,
  }
}

export default clientViewFunc
