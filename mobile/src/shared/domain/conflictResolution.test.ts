import { applyConflictChoiceToPatch } from './conflictResolution'

describe('applyConflictChoiceToPatch', () => {
  const source = {
    payload: {
      eventDate: '2026-08-20T12:00:00.000Z',
      description: 'Локальное описание',
    },
    baseValues: {
      eventDate: '2026-08-10T12:00:00.000Z',
      description: 'Старое описание',
    },
  }

  it('сохраняет несвязанное локальное изменение при выборе сервера', () => {
    const result = applyConflictChoiceToPatch({
      ...source,
      path: 'eventDate',
      local: source.payload.eventDate,
      remote: '2026-08-15T12:00:00.000Z',
      choice: 'remote',
    })

    expect(result).toEqual({
      payload: { description: 'Локальное описание' },
      baseValues: { description: 'Старое описание' },
    })
  })

  it('перебазирует выбранное локальное значение на серверную версию', () => {
    const result = applyConflictChoiceToPatch({
      ...source,
      path: 'eventDate',
      local: source.payload.eventDate,
      remote: '2026-08-15T12:00:00.000Z',
      choice: 'local',
    })

    expect(result.payload).toEqual(source.payload)
    expect(result.baseValues.eventDate).toBe('2026-08-15T12:00:00.000Z')
    expect(result.baseValues.description).toBe('Старое описание')
  })

  it('сохраняет выбранный локальный массив целиком до повторной отправки', () => {
    const local = [{ title: 'Позвонить', date: '2026-08-20' }]
    const remote = [{ title: 'Уточнить адрес', date: '2026-08-18' }]
    const result = applyConflictChoiceToPatch({
      payload: { additionalEvents: local, contractSum: 50_000 },
      baseValues: { additionalEvents: [], contractSum: 40_000 },
      path: 'additionalEvents',
      local,
      remote,
      choice: 'local',
    })

    expect(result.payload).toEqual({
      additionalEvents: local,
      contractSum: 50_000,
    })
    expect(result.baseValues).toEqual({
      additionalEvents: remote,
      contractSum: 40_000,
    })
  })

  it('накапливает решения нескольких полей без потери третьего изменения', () => {
    const first = applyConflictChoiceToPatch({
      payload: { status: 'active', contractSum: 60_000, description: 'Важно' },
      baseValues: { status: 'draft', contractSum: 40_000, description: '' },
      path: 'status',
      local: 'active',
      remote: 'canceled',
      choice: 'local',
    })
    const second = applyConflictChoiceToPatch({
      ...first,
      path: 'contractSum',
      local: 60_000,
      remote: 55_000,
      choice: 'remote',
    })

    expect(second).toEqual({
      payload: { status: 'active', description: 'Важно' },
      baseValues: { status: 'canceled', description: '' },
    })
  })
})
