export const serializeMobileProviderIntegration = ({
  provider,
  settings = {},
  available = false,
}) => {
  if (provider === 'avito') {
    return {
      provider,
      available: Boolean(available),
      enabled: Boolean(settings.enabled),
      configured: Boolean(
        settings.clientId && settings.clientSecret && settings.userId
      ),
      status: settings.status || '',
      clientId: settings.clientId || '',
      accountId: settings.userId || '',
      connectedAt: settings.connectedAt || '',
      lastCheckedAt: settings.lastCheckedAt || '',
      lastWebhookAt: settings.lastWebhookAt || '',
    }
  }
  if (provider === 'vk') {
    return {
      provider,
      available: Boolean(available),
      enabled: Boolean(settings.enabled),
      configured: Boolean(settings.groupId && settings.accessToken),
      status: settings.status || '',
      accountId: settings.groupId || '',
      connectedAt: settings.connectedAt || '',
      lastCheckedAt: settings.lastCheckedAt || '',
      lastWebhookAt: settings.lastWebhookAt || '',
    }
  }
  if (provider === 'telephony') {
    return {
      provider,
      available: Boolean(available),
      enabled: Boolean(settings.enabled),
      configured: Boolean(settings.webhookSecret),
      hasApiKey: Boolean(settings.apiKey),
      status: settings.enabled && settings.webhookSecret
        ? 'connected'
        : settings.enabled
          ? 'setup_required'
          : 'disabled',
    }
  }
  if (provider === 'ai') {
    const enabled = typeof settings.enabled === 'boolean'
      ? settings.enabled
      : Boolean(
          settings.transcriptionProvider === 'aitunnel' ||
          settings.analysisProvider
        )
    return {
      provider,
      available: Boolean(available),
      enabled,
      configured: Boolean(settings.key),
      status: enabled && settings.key
        ? 'connected'
        : enabled
          ? 'key_required'
          : 'disabled',
      analysisProvider: settings.analysisProvider || 'artistcrm',
      transcriptionProvider: settings.transcriptionProvider || '',
      hasTranscriptionKey: Boolean(settings.hasTranscriptionKey),
      canUseDeepseek: Boolean(settings.canUseDeepseek),
      platformConfigured: Boolean(settings.platformConfigured),
      transcriptionModel: settings.transcriptionModel || 'whisper-1',
      analysisModel: settings.analysisModel ||
        (settings.analysisProvider === 'deepseek'
          ? 'deepseek-v4-flash'
          : 'gpt-4o-mini'),
    }
  }
  if (provider === 'public-leads') {
    const keys = Array.isArray(settings.keys) ? settings.keys : []
    return {
      provider,
      available: Boolean(available),
      enabled: Boolean(settings.enabled),
      configured: keys.some((item) => item.enabled !== false),
      status: settings.enabled ? 'connected' : 'disabled',
      endpoint: settings.endpoint || '',
      keys: keys.map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || '').trim() || 'Источник API',
        enabled: item.enabled !== false,
        lastFour: String(item.key || '').slice(-4),
      })),
    }
  }
  return null
}
