import type { SyncRunState } from '../sync/syncState'
import { getSyncStatePresentation } from './syncStatePresentation'

const state = (values: Partial<SyncRunState>): SyncRunState => ({
  status: 'never',
  issueCount: 0,
  consecutiveFailures: 0,
  ...values,
})

describe('sync state presentation', () => {
  const now = new Date('2026-07-15T12:00:00+07:00')

  it('показывает успех и время последнего обмена', () => {
    const result = getSyncStatePresentation(
      state({
        status: 'success',
        lastSuccessAt: '2026-07-15T11:30:00+07:00',
      }),
      now
    )
    expect(result.title).toBe('Всё синхронизировано')
    expect(result.description).toContain('сегодня')
    expect(result.tone).toBe('success')
  })

  it('отделяет offline от ошибки и не обещает потерю данных', () => {
    const result = getSyncStatePresentation(
      state({ status: 'offline', lastSuccessAt: '2026-07-14T10:00:00+07:00' }),
      now
    )
    expect(result.title).toBe('Нет сети')
    expect(result.description).toContain('сохранены на телефоне')
    expect(result.description).toContain('Последняя успешная')
  })

  it('не показывает ложный успех после локального изменения', () => {
    const result = getSyncStatePresentation(state({ status: 'pending' }), now)
    expect(result.title).toContain('неотправленные изменения')
    expect(result.description).toContain('сохранены на телефоне')
    expect(result.tone).toBe('warning')
  })

  it('показывает число проблем и безопасную категорию сбоя', () => {
    expect(
      getSyncStatePresentation(
        state({ status: 'attention', issueCount: 3 }),
        now
      ).description
    ).toContain('3 элементов')
    const failed = getSyncStatePresentation(
      state({ status: 'failed', lastErrorCode: 'server' }),
      now
    )
    expect(failed.description).toContain('Сервер временно недоступен')
    expect(failed.tone).toBe('danger')
  })

  it('объясняет восстановление после process death', () => {
    const result = getSyncStatePresentation(
      state({ status: 'interrupted' }),
      now
    )
    expect(result.title).toContain('прервана')
    expect(result.description).toContain('Очередь восстановлена')
  })
})
