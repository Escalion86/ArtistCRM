import MobileSyncTombstones from '@models/MobileSyncTombstones'
import {
  findConflictingFields,
  withSyncVersionIncrement,
} from './syncConflict.js'
import { buildTombstoneUpdate } from './syncTombstone.js'

export { findConflictingFields, withSyncVersionIncrement }

export const recordSyncTombstone = async ({
  tenantId,
  entityType,
  entityId,
  version,
}) => {
  if (!tenantId || !entityType || !entityId) return null
  return MobileSyncTombstones.findOneAndUpdate(
    { tenantId, entityType, entityId: String(entityId) },
    {
      ...buildTombstoneUpdate({ tenantId, version }),
      $setOnInsert: { tenantId, entityType, entityId: String(entityId) },
    },
    { upsert: true, returnDocument: 'after' }
  )
}
