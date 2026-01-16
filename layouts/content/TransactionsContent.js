'use client'

import { useMemo, useCallback, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList as List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import TransactionTypeToggleButtons from '@components/IconToggleButtons/TransactionTypeToggleButtons'
import TransactionCard from '@layouts/cards/TransactionCard'
import transactionsAtom from '@state/atoms/transactionsAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import { useAtomValue, useSetAtom } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'
import { TRANSACTION_TYPES } from '@helpers/constants'
import { deleteData } from '@helpers/CRUD'

const ITEM_HEIGHT = 120

const TransactionsContent = () => {
  const transactions = useAtomValue(transactionsAtom)
  const setTransactions = useSetAtom(transactionsAtom)
  const clients = useAtomValue(clientsAtom)
  const events = useAtomValue(eventsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [typeFilter, setTypeFilter] = useState({
    income: true,
    expense: true,
  })

  const typeMap = useMemo(
    () =>
      TRANSACTION_TYPES.reduce((acc, item) => {
        acc[item.value] = item
        return acc
      }, {}),
    []
  )

  const clientsMap = useMemo(
    () =>
      clients.reduce((acc, client) => {
        acc[client._id] = client
        return acc
      }, {}),
    [clients]
  )

  const eventsMap = useMemo(
    () =>
      events.reduce((acc, event) => {
        acc[event._id] = event
        return acc
      }, {}),
    [events]
  )

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      }),
    [transactions]
  )

  const filteredTransactions = useMemo(() => {
    if (typeFilter.income && typeFilter.expense) return sortedTransactions
    if (typeFilter.income)
      return sortedTransactions.filter((item) => item.type === 'income')
    if (typeFilter.expense)
      return sortedTransactions.filter((item) => item.type === 'expense')
    return sortedTransactions
  }, [sortedTransactions, typeFilter])

  const handleDelete = useCallback(
    (transactionId) => {
      modalsFunc.confirm({
        title: 'Удаление транзакции',
        text: 'Вы уверены, что хотите удалить транзакцию?',
        onConfirm: async () => {
          const result = await deleteData(
            `/api/transactions/${transactionId}`,
            null,
            null,
            {},
            true
          )
          if (result?.success) {
            setTransactions((prev) =>
              prev.filter((item) => item._id !== transactionId)
            )
          }
        },
      })
    },
    [modalsFunc, setTransactions]
  )

  const renderRow = useCallback(
    ({ index, style }) => {
      const transaction = filteredTransactions[index]
      const client = clientsMap[transaction.clientId]
      const event = eventsMap[transaction.eventId]
      const type = typeMap[transaction.type] ?? typeMap.expense
      const handleEdit = () =>
        modalsFunc.transaction?.edit(transaction.eventId, transaction._id)

      return (
        <TransactionCard
          style={style}
          transaction={transaction}
          client={client}
          event={event}
          type={type}
          onEdit={handleEdit}
          onDelete={() => handleDelete(transaction._id)}
        />
      )
    },
    [
      filteredTransactions,
      clientsMap,
      eventsMap,
      typeMap,
      modalsFunc.transaction,
      handleDelete,
    ]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <TransactionTypeToggleButtons
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>
              {filteredTransactions.length} из {transactions.length}
            </span>
            <Button
              name="+"
              collapsing
              className="action-icon-button h-9 w-9 rounded-full text-lg"
              onClick={() => modalsFunc.transaction?.add()}
              disabled={!modalsFunc.transaction?.add}
            />
          </div>
        </div>
      </ContentHeader>
      <div className="min-h-0 flex-1 overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredTransactions.length}
                itemSize={ITEM_HEIGHT}
                itemKey={(index) => filteredTransactions[index]._id ?? index}
              >
                {renderRow}
              </List>
            )}
          </AutoSizer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            Транзакций пока нет
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionsContent
