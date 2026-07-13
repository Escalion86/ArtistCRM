import Histories from '@models/Histories'
import { writeHistorySafely } from './historyAuditCore.mjs'

const createHistorySafely = (entry, context = '') =>
  writeHistorySafely({
    create: (historyEntry) => Histories.create(historyEntry),
    entry,
    context,
  })

export default createHistorySafely
