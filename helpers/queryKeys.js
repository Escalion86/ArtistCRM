export const queryKeys = {
  clients: (params = {}) => ['clients', params],
  client: (clientId) => ['client', clientId],
  clientRelations: (clientId) => ['clientRelations', clientId],
  events: (params = {}) => ['events', params],
  event: (eventId) => ['event', eventId],
  transactions: (params = {}) => ['transactions', params],
  transactionsAll: ['transactions', {}],
  statistics: (params = {}) => ['statistics', params],
}
