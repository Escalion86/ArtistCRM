import Clients from '@models/Clients'
import Events from '@models/Events'
import MobileSyncOperations from '@models/MobileSyncOperations'
import ServiceGroups from '@models/ServiceGroups'
import Services from '@models/Services'
import Transactions from '@models/Transactions'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import { findConflictingFields } from '@server/mobile/sync'
import {
  validateSyncOperation,
} from '@server/mobile/syncOperations'
import {
  markSyncOperationApplying,
  persistSyncOperationResult,
  reserveSyncOperation,
} from '@server/mobile/syncOperationStore'
import {
  DELETE as deleteClient,
  PUT as updateClient,
} from '../../../../clients/[id]/route'
import { POST as createClient } from '../../../../clients/route'
import {
  DELETE as deleteEvent,
  PUT as updateEvent,
} from '../../../../events/[id]/route'
import { POST as createEvent } from '../../../../events/route'
import {
  DELETE as deleteGroup,
  PUT as updateGroup,
} from '../../../../service-groups/[id]/route'
import { POST as createGroup } from '../../../../service-groups/route'
import {
  DELETE as deleteService,
  PUT as updateService,
} from '../../../../services/[id]/route'
import { POST as createService } from '../../../../services/route'
import {
  DELETE as deleteTransaction,
  PUT as updateTransaction,
} from '../../../../transactions/[id]/route'
import { POST as createTransaction } from '../../../../transactions/route'

const MAX_OPERATIONS = 50

const resources = {
  events: {
    model: Events,
    create: createEvent,
    update: updateEvent,
    delete: deleteEvent,
  },
  clients: {
    model: Clients,
    create: createClient,
    update: updateClient,
    delete: deleteClient,
  },
  transactions: {
    model: Transactions,
    create: createTransaction,
    update: updateTransaction,
    delete: deleteTransaction,
  },
  services: {
    model: Services,
    create: createService,
    update: updateService,
    delete: deleteService,
  },
  serviceGroups: {
    model: ServiceGroups,
    create: createGroup,
    update: updateGroup,
    delete: deleteGroup,
  },
}

const failure = (operation, code, message) => ({
  operationId: operation.operationId,
  status: 'failed',
  error: { code, message },
})

const reservationResponse = (decision, operation) => {
  if (decision.state === 'replay') return decision.response
  if (decision.state === 'reused') {
    return failure(
      operation,
      'IDEMPOTENCY_KEY_REUSED',
      'operationId уже использован для другой операции'
    )
  }
  if (decision.state === 'processing') {
    return failure(
      operation,
      'OPERATION_IN_PROGRESS',
      'Операция уже выполняется. Повторите синхронизацию позже'
    )
  }
  if (decision.state === 'unknown') {
    return failure(
      operation,
      'OPERATION_STATE_UNKNOWN',
      'Сервер не может безопасно повторить операцию. Обновите данные и проверьте результат'
    )
  }
  return null
}

const callResource = async ({ req, operation, resource }) => {
  const method = operation.method
  const payload = { ...(operation.payload || {}) }
  delete payload._id
  delete payload.tenantId
  delete payload.syncVersion
  const request = new Request(req.url, {
    method: method === 'create' ? 'POST' : method === 'delete' ? 'DELETE' : 'PUT',
    headers: req.headers,
    body: method === 'delete' ? undefined : JSON.stringify(payload),
  })
  if (method === 'create') return resource.create(request)
  const routeContext = { params: Promise.resolve({ id: operation.entityId }) }
  if (method === 'update') return resource.update(request, routeContext)
  if (method === 'delete') return resource.delete(request, routeContext)
  return null
}

const applyOperation = async ({ req, context, operation }) => {
  const reserved = await reserveSyncOperation({
    model: MobileSyncOperations,
    tenantId: context.tenantId,
    userId: context.user._id,
    operation,
  })
  if (reserved.state !== 'claimed') {
    return reservationResponse(reserved, operation)
  }

  const complete = async (response) => {
    await persistSyncOperationResult({
      model: MobileSyncOperations,
      tenantId: context.tenantId,
      operationId: operation.operationId,
      operationHash: reserved.operationHash,
      status: response.status,
      response,
    })
    return response
  }

  try {
    const resource = resources[operation.entityType]
    if (!resource) {
      return complete(failure(
        operation,
        'ENTITY_NOT_SUPPORTED',
        'Тип данных не поддерживается'
      ))
    }

    if (operation.method !== 'create') {
      const current = await resource.model
        .findOne({ _id: operation.entityId, tenantId: context.tenantId })
        .lean()
      if (!current && operation.method === 'update') {
        return complete(failure(operation, 'ENTITY_NOT_FOUND', 'Запись не найдена'))
      }
      if (
        current &&
        operation.baseVersion !== undefined &&
        Number(current.syncVersion || 1) !== Number(operation.baseVersion)
      ) {
        const conflicts = findConflictingFields({
          current,
          patch: operation.payload,
          baseValues: operation.baseValues,
        })
        if (conflicts.length > 0) {
          return complete({
            operationId: operation.operationId,
            status: 'conflict',
            entityType: operation.entityType,
            entityId: operation.entityId,
            remoteVersion: current.syncVersion || 1,
            conflicts,
          })
        }
      }
    }

    await markSyncOperationApplying({
      model: MobileSyncOperations,
      tenantId: context.tenantId,
      operationId: operation.operationId,
      operationHash: reserved.operationHash,
    })
    const resourceResponse = await callResource({ req, operation, resource })
    if (!resourceResponse) {
      return complete(failure(operation, 'INVALID_OPERATION', 'Некорректная операция'))
    }
    const body = await resourceResponse.json().catch(() => ({}))
    return complete(resourceResponse.ok
      ? {
          operationId: operation.operationId,
          status: 'applied',
          entityType: operation.entityType,
          localEntityId: operation.entityId,
          entity: body?.data || null,
        }
      : {
          operationId: operation.operationId,
          status: 'failed',
          error:
            typeof body?.error === 'object'
              ? body.error
              : { code: 'MUTATION_FAILED', message: body?.error || 'Ошибка сохранения' },
        })
  } catch {
    return complete(failure(
      operation,
      'OPERATION_APPLY_FAILED',
      'Не удалось применить операцию синхронизации'
    ))
  }
}

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const body = await req.json().catch(() => ({}))
  const operations = Array.isArray(body?.operations)
    ? body.operations.slice(0, MAX_OPERATIONS)
    : []
  if (operations.length === 0) {
    return mobileError('OPERATIONS_REQUIRED', 'Нет операций для синхронизации', 400)
  }
  const invalidOperation = operations
    .map((operation) => validateSyncOperation(operation))
    .find(Boolean)
  if (invalidOperation) {
    return mobileError(invalidOperation.code, invalidOperation.message, 400)
  }

  await dbConnect()
  const results = []
  for (const operation of operations) {
    results.push(await applyOperation({ req, context, operation }))
  }
  return mobileSuccess({ results })
}
