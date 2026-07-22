import {
  failPlatformAiUsage,
  reservePlatformAiUsage,
  settlePlatformAiUsage,
} from '@server/aiBilling'

const TRANSCRIPTION_PROVIDERS = Object.freeze({
  artistcrm: {
    apiUrl: 'https://api.aitunnel.ru/v1/audio/transcriptions',
    apiKeyEnv: 'AITUNNEL_KEY',
    modelEnv: 'AITUNNEL_TRANSCRIPTION_MODEL',
    defaultModel: 'whisper-1',
  },
  openai: {
    apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_TRANSCRIPTION_MODEL',
    defaultModel: 'whisper-1',
  },
  aitunnel: {
    apiUrl: 'https://api.aitunnel.ru/v1/audio/transcriptions',
    apiKeyEnv: 'AITUNNEL_KEY',
    modelEnv: 'AITUNNEL_TRANSCRIPTION_MODEL',
    defaultModel: 'whisper-1',
  },
})

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const getTranscriptionProviderConfig = (settings = {}) => {
  const providerName = String(
    settings.aiTranscriptionProvider ||
      process.env.AI_TRANSCRIPTION_PROVIDER ||
      'aitunnel'
  )
    .trim()
    .toLowerCase()
  const provider = TRANSCRIPTION_PROVIDERS[providerName]
  if (!provider) {
    return {
      name: providerName,
      error: 'TRANSCRIPTION_PROVIDER_UNSUPPORTED',
    }
  }
  return {
    name: providerName,
    apiUrl: process.env.AI_TRANSCRIPTION_API_URL || provider.apiUrl,
    apiKey:
      providerName === 'aitunnel'
        ? settings.aitunnelKey || ''
        : process.env[provider.apiKeyEnv],
    model:
      settings.aiTranscriptionModel ||
      process.env[provider.modelEnv] ||
      provider.defaultModel,
  }
}

export const isCallTranscriptionConfigured = (settings = {}) => {
  const provider = getTranscriptionProviderConfig(settings)
  return Boolean(!provider.error && provider.apiKey)
}

const getFileNameFromUrl = (url) => {
  try {
    const parsed = new URL(url)
    const name = parsed.pathname.split('/').filter(Boolean).pop()
    return name || 'recording.mp3'
  } catch (error) {
    return 'recording.mp3'
  }
}

const fetchRecordingBlob = async (recordingUrl) => {
  const response = await fetch(recordingUrl)
  if (!response.ok) {
    throw new Error(`RECORDING_DOWNLOAD_FAILED:${response.status}`)
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_AUDIO_BYTES) {
    throw new Error('RECORDING_TOO_LARGE')
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_AUDIO_BYTES) {
    throw new Error('RECORDING_TOO_LARGE')
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg'
  return new Blob([arrayBuffer], { type: contentType })
}

const transcribeBlobWithOpenAiCompatible = async ({
  provider,
  audioBlob,
  fileName,
  settings = {},
  feature = 'call_transcription',
  operationId,
  groupId = '',
}) => {
  let reservation = null
  if (provider.name === 'artistcrm') {
    reservation = await reservePlatformAiUsage({
      tenantId: settings.tenantId,
      userId: settings.userId,
      feature,
      model: provider.model,
      operationId,
      groupId,
    })
  }
  const formData = new FormData()
  formData.set('model', provider.model)
  formData.set('language', 'ru')
  formData.set('response_format', 'json')
  formData.set('file', audioBlob, fileName || 'recording.webm')

  let response
  let payload
  try {
    response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: formData,
    })
    payload = await response.json().catch(() => null)
  } catch (error) {
    await failPlatformAiUsage(reservation, 'AI_PROVIDER_NETWORK_FAILED')
    throw error
  }

  if (!response.ok) {
    await failPlatformAiUsage(reservation, `AI_PROVIDER_HTTP_${response.status}`)
    const message =
      payload?.error?.message ||
      `${provider.name} transcription failed: ${response.status}`
    throw new Error(message)
  }

  if (reservation) {
    await settlePlatformAiUsage(reservation, payload?.usage)
  }

  const text = String(payload?.text || '').trim()
  if (!text) throw new Error('TRANSCRIPTION_EMPTY')
  return text
}

const transcribeWithOpenAiCompatible = async ({
  provider,
  recordingUrl,
  settings,
  options,
}) => {
  const audioBlob = await fetchRecordingBlob(recordingUrl)
  return transcribeBlobWithOpenAiCompatible({
    provider,
    audioBlob,
    fileName: getFileNameFromUrl(recordingUrl),
    settings,
    ...options,
  })
}

export const transcribeAudioBlob = async (
  audioBlob,
  fileName = 'recording.webm',
  settings = {},
  options = {}
) => {
  if (!audioBlob) throw new Error('AUDIO_FILE_REQUIRED')
  if (audioBlob.size > MAX_AUDIO_BYTES) throw new Error('RECORDING_TOO_LARGE')

  const provider = getTranscriptionProviderConfig(settings)
  if (provider.error) throw new Error(provider.error)
  if (!provider.apiKey) throw new Error('TRANSCRIPTION_API_KEY_REQUIRED')

  if (
    provider.name === 'openai' ||
    provider.name === 'aitunnel' ||
    provider.name === 'artistcrm'
  ) {
    return transcribeBlobWithOpenAiCompatible({
      provider,
      audioBlob,
      fileName,
      settings,
      ...options,
    })
  }

  throw new Error('TRANSCRIPTION_PROVIDER_UNSUPPORTED')
}

export const transcribeCallRecording = async (
  recordingUrl,
  settings = {},
  options = {}
) => {
  if (!recordingUrl) throw new Error('RECORDING_URL_REQUIRED')

  const provider = getTranscriptionProviderConfig(settings)
  if (provider.error) throw new Error(provider.error)
  if (!provider.apiKey) throw new Error('TRANSCRIPTION_API_KEY_REQUIRED')

  if (
    provider.name === 'openai' ||
    provider.name === 'aitunnel' ||
    provider.name === 'artistcrm'
  ) {
    return transcribeWithOpenAiCompatible({
      provider,
      recordingUrl,
      settings,
      options,
    })
  }

  throw new Error('TRANSCRIPTION_PROVIDER_UNSUPPORTED')
}
