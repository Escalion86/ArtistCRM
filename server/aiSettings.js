import SiteSettings from '@models/SiteSettings'
import Users from '@models/Users'

const getCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const normalizeStringList = (items) =>
  Array.isArray(items)
    ? items
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : []

export const getTenantAiSettings = async (tenantId) => {
  if (!tenantId) return {}
  const [siteSettings, owner] = await Promise.all([
    SiteSettings.findOne({ tenantId }).lean(),
    Users.findById(tenantId).select('_id role').lean(),
  ])
  const custom = siteSettings?.custom ?? {}
  const aitunnelKey = String(getCustomValue(custom, 'aitunnelKey') || '').trim()
  const deepseekKey = String(getCustomValue(custom, 'deepseekKey') || '').trim()
  const isDeveloper = owner?.role === 'dev'
  const savedAnalysisProvider = String(
    getCustomValue(custom, 'aiAnalysisProvider') || ''
  )
    .trim()
    .toLowerCase()
  const aiAnalysisProvider =
    savedAnalysisProvider === 'deepseek' && !isDeveloper
      ? aitunnelKey
        ? 'aitunnel'
        : 'artistcrm'
      : ['artistcrm', 'aitunnel', 'deepseek'].includes(savedAnalysisProvider)
        ? savedAnalysisProvider
        : aitunnelKey
          ? 'aitunnel'
          : 'artistcrm'
  const savedEnabled = getCustomValue(custom, 'aiIntegrationEnabled')
  return {
    tenantId: String(tenantId),
    userId: String(owner?._id || tenantId),
    isDeveloper,
    aitunnelKey,
    deepseekKey: isDeveloper ? deepseekKey : '',
    aiIntegrationEnabled:
      typeof savedEnabled === 'boolean' ? savedEnabled : true,
    aiAnalysisProvider,
    aiAnalysisModel:
      aiAnalysisProvider === 'artistcrm'
        ? String(
            process.env.AITUNNEL_CALL_ANALYSIS_MODEL || 'gpt-4o-mini'
          ).trim()
        : String(getCustomValue(custom, 'aiAnalysisModel') || '').trim(),
    aiTranscriptionProvider: String(
      aiAnalysisProvider === 'artistcrm'
        ? 'artistcrm'
        : getCustomValue(custom, 'aiTranscriptionProvider') ||
            (aitunnelKey ? 'aitunnel' : '')
    ).trim(),
    aiTranscriptionModel:
      aiAnalysisProvider === 'artistcrm'
        ? String(
            process.env.AITUNNEL_TRANSCRIPTION_MODEL || 'whisper-1'
          ).trim()
        : String(
            getCustomValue(custom, 'aiTranscriptionModel') || ''
          ).trim(),
    eventTypes: normalizeStringList(getCustomValue(custom, 'eventTypes')),
  }
}
