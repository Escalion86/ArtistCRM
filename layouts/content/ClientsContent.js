'use client'

import { useMemo, useState, useCallback } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import Input from '@components/Input'
import ClientCard from '@layouts/cards/ClientCard'
import clientsAtom from '@state/atoms/clientsAtom'
import requestsAtom from '@state/atoms/requestsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'

const ITEM_HEIGHT = 140

const ClientsContent = () => {
  const clients = useAtomValue(clientsAtom)
  const requests = useAtomValue(requestsAtom)
  const events = useAtomValue(eventsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)

  const [search, setSearch] = useState('')

  const clientsWithStats = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    return clients
      .map((client) => {
        const clientRequests = requests.filter(
          (request) => request.clientId === client._id
        )
        const clientEvents = events.filter(
          (event) => event.clientId === client._id
        )
        const canceledEventsCount = clientEvents.filter(
          (event) => event.status === 'canceled'
        ).length
        const activeEventsCount = clientEvents.length - canceledEventsCount
        const lastRequest = clientRequests.reduce((latest, request) => {
          if (!request.createdAt) return latest
          const requestDate = new Date(request.createdAt)
          return !latest || requestDate > latest ? requestDate : latest
        }, null)
        return {
          ...client,
          requestsCount: clientRequests.length,
          eventsCount: activeEventsCount,
          canceledEventsCount,
          lastRequest,
        }
      })
      .filter((client) => {
        if (!lowerSearch) return true
        return [
          client.firstName,
          client.secondName,
          client.phone ? `+${client.phone}` : '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(lowerSearch)
      })
      .sort((a, b) => {
        if (a.lastRequest && b.lastRequest)
          return b.lastRequest.getTime() - a.lastRequest.getTime()
        if (a.lastRequest) return -1
        if (b.lastRequest) return 1
        return (b.requestsCount || 0) - (a.requestsCount || 0)
      })
  }, [clients, events, requests, search])

  const RowComponent = useCallback(
    ({ index, style }) => {
      const client = clientsWithStats[index]
      return (
        <ClientCard
          style={style}
          client={client}
          onEdit={() => modalsFunc.client?.edit(client._id)}
          onView={() => modalsFunc.client?.view(client._id)}
        />
      )
    },
    [clientsWithStats, modalsFunc.client]
  )

  return (
    <div className="flex h-full flex-col">
      <ContentHeader>
        <div className="flex flex-1 items-center justify-between">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Всего: {clients.length}</span>
            <Button
              name="+"
              collapsing
              className="action-icon-button h-9 w-9 rounded-full text-lg"
              onClick={() => modalsFunc.client?.add()}
              disabled={!modalsFunc.client?.add}
            />
          </div>
        </div>
      </ContentHeader>
      <div className="p-2">
        <Input
          label="Поиск клиента"
          value={search}
          onChange={setSearch}
          placeholder="Введите имя или телефон"
          noMargin
        />
      </div>
      <div className="min-h-0 flex-1 overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
        {clientsWithStats.length > 0 ? (
          <List
            rowCount={clientsWithStats.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={{}}
                                    style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Клиенты не найдены
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientsContent
