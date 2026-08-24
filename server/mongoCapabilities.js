const TRANSACTION_TOPOLOGY_TYPES = new Set([
  'ReplicaSetWithPrimary',
  'Sharded',
  'LoadBalanced',
])

export const getMongoTopologyType = (connection) => {
  const client = connection?.getClient?.() ?? connection?.client
  return client?.topology?.description?.type ?? ''
}

export const supportsMongoTransactions = (connection) =>
  TRANSACTION_TOPOLOGY_TYPES.has(getMongoTopologyType(connection))

