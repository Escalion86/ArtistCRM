import { useEffect, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import clientSelector from '@state/selectors/clientSelector'
import eventsAtom from '@state/atoms/eventsAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import { modalsFuncAtom } from '@state/atoms'
import CardButtons from '@components/CardButtons'

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

    if (!clientId || !client)
      return (
        <div className="flex justify-center w-full text-lg ">
          ОШИБКА! Клиент не найден!
        </div>
      )

    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()

    const clientEvents = useMemo(
      () => events.filter((event) => event.clientId === clientId),
      [events, clientId]
    )

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

    const clientTransactions = useMemo(
      () =>
        (transactions ?? []).filter(
          (transaction) => transaction.clientId === clientId
        ),
      [transactions, clientId]
    )

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

    useEffect(() => {
      if (setTopLeftComponent)
        setTopLeftComponent(() => (
          <CardButtonsComponent
            client={client}
            onEdit={() => modalsFunc.client?.edit(clientId)}
          />
        ))
    }, [client, clientId, modalsFunc.client, setTopLeftComponent])

    return (
      <div className="flex flex-col gap-4 text-sm text-gray-800">
        <div className="relative p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {[client.firstName, client.secondName].filter(Boolean).join(' ') ||
              'Без имени'}
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
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm font-semibold text-gray-900">
            Мероприятия
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
