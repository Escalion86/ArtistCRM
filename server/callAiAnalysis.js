import { requestAiChatCompletion } from '@server/aiChatCompletion'

const EVENT_TYPES = new Set([
  'kids',
  'birthday',
  'wedding',
  'corporate',
  'presentation',
  'opening',
  'club',
])

const trimText = (value, maxLength = 12000) =>
  String(value ?? '').trim().slice(0, maxLength)

const parseJsonObject = (value) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch (error) {
    const match = String(value).match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch (nestedError) {
      return null
    }
  }
}

const parseDateOrNull = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseBudget = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : null
}

const normalizeStringList = (items) =>
  Array.isArray(items)
    ? items
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : []

const normalizeEventType = (value, allowedEventTypes = []) => {
  const normalized = String(value ?? '').trim()
  const lowerNormalized = normalized.toLowerCase()
  const existingEventType = allowedEventTypes.find(
    (item) => item.toLowerCase() === lowerNormalized
  )
  if (existingEventType) return existingEventType
  if (allowedEventTypes.length) return ''
  return EVENT_TYPES.has(normalized) ? normalized : ''
}

export const normalizeAiCallAnalysis = (raw, options = {}) => {
  const data = raw && typeof raw === 'object' ? raw : {}
  const allowedEventTypes = normalizeStringList(options.eventTypes)
  const confidence = Number(data.confidence)
  return {
    summary: trimText(data.summary, 3000),
    extractedFields: {
      clientName: trimText(data.clientName, 120),
      eventType: normalizeEventType(data.eventType, allowedEventTypes),
      eventDate: parseDateOrNull(data.eventDate),
      eventCity: trimText(data.eventCity, 120),
      eventLocation: trimText(data.eventLocation, 240),
      guestCount: trimText(data.guestCount, 80),
      budget: parseBudget(data.budget),
      nextContactAt: parseDateOrNull(data.nextContactAt),
      nextContactReason: trimText(data.nextContactReason, 240),
      objections: Array.isArray(data.objections)
        ? data.objections.map((item) => trimText(item, 180)).filter(Boolean)
        : [],
      confidence: Number.isFinite(confidence)
        ? Math.max(0, Math.min(1, confidence))
        : 0,
    },
  }
}

const buildFallbackAnalysis = (transcript, settings = {}) => {
  const text = trimText(transcript, 3000)
  const firstLine = text.split('\n').find(Boolean) || text.slice(0, 220)
  return normalizeAiCallAnalysis(
    {
      summary: firstLine
        ? `AI-анализ не настроен. Черновое резюме по transcript: ${firstLine}`
        : 'AI-анализ не настроен. Добавьте transcript или настройте AI provider API key.',
      eventType: '',
      confidence: 0.1,
    },
    settings
  )
}

const buildEventTypeInstruction = (settings = {}) => {
  const eventTypes = normalizeStringList(settings.eventTypes)
  if (!eventTypes.length) {
    return 'одно из kids, birthday, wedding, corporate, presentation, opening, club; если нет уверенного совпадения, верни пустую строку.'
  }
  return `строго одно из существующих значений: ${eventTypes
    .map((item) => JSON.stringify(item))
    .join(', ')}; если нет уверенного совпадения, верни пустую строку.`
}

const buildPrompt = (transcript, settings = {}) => `
Ты анализируешь телефонный разговор артиста с потенциальным клиентом CRM.
Верни только JSON без markdown.

Нужно извлечь поля:
- summary: краткое резюме разговора на русском языке.
- clientName: имя клиента, если оно явно звучит.
- eventType: ${buildEventTypeInstruction(settings)}
- eventDate: дата/время мероприятия в ISO 8601 или null.
- eventCity: город, если есть.
- eventLocation: площадка/адрес/комментарий к месту, если есть.
- guestCount: количество гостей строкой, если есть.
- budget: число в рублях или null.
- nextContactAt: дата/время следующего контакта в ISO 8601 или null.
- nextContactReason: почему нужен следующий контакт.
- objections: массив сомнений/возражений клиента.
- confidence: число от 0 до 1.

Если данных нет или они сомнительные, ставь null/пустую строку и снижай confidence.

Transcript:
${transcript}
`

export const analyzeCallTranscript = async (
  transcript,
  settings = {},
  options = {}
) => {
  const cleanTranscript = trimText(transcript)
  if (!cleanTranscript) {
    return buildFallbackAnalysis('', settings)
  }

  const completion = await requestAiChatCompletion({
    settings,
    feature: options.feature || 'call_analysis',
    operationId: options.operationId,
    groupId: options.groupId || '',
    messages: [
      {
        role: 'system',
        content:
          'Ты аккуратный CRM-ассистент. Извлекаешь только явно подтвержденные данные и возвращаешь строгий JSON.',
      },
      { role: 'user', content: buildPrompt(cleanTranscript, settings) },
    ],
  })
  if (!completion) return buildFallbackAnalysis(cleanTranscript, settings)

  const json = parseJsonObject(completion.content)
  if (!json) throw new Error('AI вернул некорректный JSON')

  return normalizeAiCallAnalysis(json, settings)
}
