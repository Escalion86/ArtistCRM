const hasText = (value) => Boolean(String(value || '').trim())

export const getCallRecordingNotificationState = ({
  call,
  phoneLabel = '',
  canAutoCreateEventFromRecording = false,
} = {}) => {
  if (!call?._id || !call?.recordingUrl) return null

  const canCreateEvent =
    hasText(call.transcript) || Boolean(canAutoCreateEventFromRecording)

  if (canCreateEvent) {
    return {
      kind: 'create_event_prompt',
      categoryId: 'call-actions',
      body: phoneLabel
        ? `Звонок с ${phoneLabel}. Создать заявку из разговора?`
        : 'Создать заявку из разговора?',
      actions: [
        { action: 'create_event', title: 'Да' },
        { action: 'no_event', title: 'Нет' },
      ],
    }
  }

  return {
    kind: 'open_call_prompt',
    body: phoneLabel
      ? `Звонок с ${phoneLabel}. Для автоматической заявки подключите ИИ или откройте звонок и заполните заявку вручную.`
      : 'Для автоматической заявки подключите ИИ или откройте звонок и заполните заявку вручную.',
    actions: [{ action: 'open_call', title: 'Открыть звонок' }],
  }
}
