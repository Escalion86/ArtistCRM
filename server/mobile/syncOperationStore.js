import {
  classifyExistingSyncOperation,
  getSyncOperationFingerprint,
  getSyncOperationScope,
  SYNC_OPERATION_TTL_MS,
} from './syncOperations.js'

export const reserveSyncOperation = async ({
  model,
  tenantId,
  userId,
  operation,
  now = new Date(),
}) => {
  const operationHash = getSyncOperationFingerprint(operation)
  const scope = getSyncOperationScope(tenantId, operation.operationId)
  const reservation = {
    tenantId,
    userId,
    operationId: operation.operationId,
    operationHash,
    entityType: operation.entityType,
    entityId: operation.entityId,
    status: 'processing',
    phase: 'reserved',
    response: null,
    expiresAt: new Date(now.getTime() + SYNC_OPERATION_TTL_MS),
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await model.findOne(scope).lean()
    const decision = classifyExistingSyncOperation({
      existing,
      fingerprint: operationHash,
      now,
    })
    if (!['claim', 'reclaim'].includes(decision.state)) return decision

    if (decision.state === 'reclaim') {
      const claimed = await model.findOneAndUpdate(
        {
          ...scope,
          _id: existing._id,
          status: existing.status,
          updatedAt: existing.updatedAt,
        },
        { $set: reservation },
        { returnDocument: 'after' }
      )
      if (claimed) return { state: 'claimed', operationHash }
      continue
    }

    try {
      await model.create(reservation)
      return { state: 'claimed', operationHash }
    } catch (error) {
      if (error?.code !== 11000) throw error
    }
  }

  return { state: 'processing' }
}

export const markSyncOperationApplying = async ({
  model,
  tenantId,
  operationId,
  operationHash,
}) => {
  const result = await model.updateOne(
    {
      ...getSyncOperationScope(tenantId, operationId),
      operationHash,
      status: 'processing',
      phase: 'reserved',
    },
    { $set: { phase: 'applying' } }
  )
  if (!result.matchedCount) throw new Error('SYNC_OPERATION_RESERVATION_LOST')
}

export const persistSyncOperationResult = async ({
  model,
  tenantId,
  operationId,
  operationHash,
  status,
  response,
  now = new Date(),
}) => {
  const result = await model.updateOne(
    {
      ...getSyncOperationScope(tenantId, operationId),
      operationHash,
    },
    {
      $set: {
        status,
        phase: 'completed',
        response,
        expiresAt: new Date(now.getTime() + SYNC_OPERATION_TTL_MS),
      },
    }
  )
  if (!result.matchedCount) throw new Error('SYNC_OPERATION_RESERVATION_LOST')
}
