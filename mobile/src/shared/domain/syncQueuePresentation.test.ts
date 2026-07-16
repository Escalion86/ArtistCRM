import {
  getFileStatusPresentation,
  getOutboxMethodLabel,
  getOutboxStatusPresentation,
  getQueueEntityTitle,
  getSafeSyncErrorMessage,
} from './syncQueuePresentation'

describe('sync queue presentation', () => {
  it('показывает понятные действия, статусы и названия сущностей', () => {
    expect(getOutboxMethodLabel('create')).toBe('Создание')
    expect(getOutboxStatusPresentation('failed')).toEqual({
      label: 'Ошибка',
      tone: 'danger',
    })
    expect(getFileStatusPresentation('uploading').label).toBe('Отправляется')
    expect(
      getQueueEntityTitle('clients', 'client-1', {
        'clients:client-1': 'Иван Петров',
      })
    ).toBe('Иван Петров')
    expect(getQueueEntityTitle('events', 'missing', {})).toBe('Мероприятие')
  })

  it('не выводит URL, токены и внутренние ошибки в пользовательский UI', () => {
    const secretError =
      'POST https://internal.example/api failed: Bearer secret-token stack trace'
    const message = getSafeSyncErrorMessage(secretError)
    expect(message).toBe(
      'Не удалось синхронизировать изменение. Повторите отправку.'
    )
    expect(message).not.toContain('internal.example')
    expect(message).not.toContain('secret-token')
  })

  it('преобразует ожидаемые ошибки в полезные подсказки', () => {
    expect(getSafeSyncErrorMessage('Network request failed')).toContain(
      'Нет соединения'
    )
    expect(
      getSafeSyncErrorMessage('Локальный зашифрованный файл не найден', 'file')
    ).toContain('Добавьте вложение повторно')
  })
})
