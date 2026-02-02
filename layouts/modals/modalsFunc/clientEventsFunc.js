import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import clientSelector from '@state/selectors/clientSelector'
import eventsAtom from '@state/atoms/eventsAtom'
import { modalsFuncAtom } from '@state/atoms'
import formatDate from '@helpers/formatDate'
import formatDateTime from '@helpers/formatDateTime'
import Button from '@components/Button'

const clientEventsFunc = (clientId) => {
  const ClientEventsModal = () => {
    const client = useAtomValue(clientSelector(clientId))
    const events = useAtomValue(eventsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)

    if (!clientId || !client)
      return (
        <div className="flex w-full justify-center text-lg ">
          ОШИБКА! Клиент не найден!
        </div>
      )

    const clientRequests = useMemo(
      () =>
        events.filter(
          (event) => event.clientId === clientId && event.status === 'draft'
        ),
      [events, clientId]
    )

    const clientEvents = useMemo(
      () =>
        events.filter(
          (event) => event.clientId === clientId && event.status !== 'draft'
        ),
      [events, clientId]
    )

    return (
      <div className="flex flex-col gap-4 text-sm text-gray-800">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-base font-semibold text-gray-900">
            {[client.firstName, client.secondName].filter(Boolean).join(' ') ||
              'Без имени'}
          </div>
          <div className="mt-1 text-gray-600">
            {client.phone ? `+${client.phone}` : 'Телефон не указан'}
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              Заявки клиента
            </div>
            <div className="text-xs text-gray-500">
              Всего: {clientRequests.length}
            </div>
          </div>
          {clientRequests.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {clientRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {request.eventDate
                        ? formatDate(request.eventDate, false, true)
                        : 'Дата не указана'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {request.description || 'Комментарий не указан'}
                    </div>
                  </div>
                  <Button
                    name="Открыть"
                    thin
                    className="h-8 px-3 text-xs"
                    onClick={() => modalsFunc.event?.view(request._id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-500">Заявок нет</div>
          )}
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              Мероприятия клиента
            </div>
            <div className="text-xs text-gray-500">
              Всего: {clientEvents.length}
            </div>
          </div>
          {clientEvents.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {clientEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {event.eventDate
                        ? formatDateTime(event.eventDate)
                        : 'Дата не указана'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {event.description
                        ? event.description
                            .replace(/<[^>]+>/g, '')
                            .slice(0, 80)
                        : 'Описание не указано'}
                    </div>
                  </div>
                  <Button
                    name="Открыть"
                    thin
                    className="h-8 px-3 text-xs"
                    onClick={() => modalsFunc.event?.view(event._id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-500">
              Мероприятий нет
            </div>
          )}
        </div>
      </div>
    )
  }

  return {
    title: 'Заявки и мероприятия клиента',
    confirmButtonName: 'Закрыть',
    showDecline: false,
    onConfirm: true,
    Children: ClientEventsModal,
  }
}

export default clientEventsFunc
