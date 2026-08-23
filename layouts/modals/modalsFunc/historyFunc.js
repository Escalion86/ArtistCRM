import HistoryFeed from '@components/HistoryFeed'

const ENTITY_TITLES = {
  event: 'История заявки или мероприятия',
  client: 'История клиента',
  transaction: 'История транзакции',
}

const historyFunc = (entityType, entityId) => ({
  title: ENTITY_TITLES[entityType] || 'История действий',
  Children: () => (
    <div className="max-h-[70dvh] w-full overflow-y-auto pr-1">
      <HistoryFeed filters={{ entityType, entityId, limit: 30 }} compact />
    </div>
  ),
  declineButtonName: 'Закрыть',
  showDecline: true,
})

export default historyFunc
