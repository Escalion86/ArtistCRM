import { createNotificationResponseProcessor } from './responseProcessor'

type Response = { id: string }

describe('createNotificationResponseProcessor', () => {
  it('не выполняет один response одновременно и повторно после успеха', async () => {
    let finish: () => void = () => {}
    const handle = jest.fn(
      () => new Promise<{ eventChanged: boolean }>((resolve) => {
        finish = () => resolve({ eventChanged: true })
      })
    )
    const afterSuccess = jest.fn(async () => undefined)
    const process = createNotificationResponseProcessor<Response>({
      getKey: (response) => response.id,
      handle,
      afterSuccess,
    })

    const first = process({ id: 'response-1' })
    await expect(process({ id: 'response-1' })).resolves.toBe(false)
    finish()
    await expect(first).resolves.toBe(true)
    await expect(process({ id: 'response-1' })).resolves.toBe(false)
    expect(handle).toHaveBeenCalledTimes(1)
    expect(afterSuccess).toHaveBeenCalledWith({ eventChanged: true })
  })

  it('разрешает retry после ошибки обработчика', async () => {
    const handle = jest
      .fn<Promise<void>, [Response]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    const process = createNotificationResponseProcessor<Response>({
      getKey: (response) => response.id,
      handle,
      afterSuccess: async () => undefined,
    })

    await expect(process({ id: 'response-1' })).rejects.toThrow('offline')
    await expect(process({ id: 'response-1' })).resolves.toBe(true)
    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('игнорирует пустой response и response без ключа', async () => {
    const handle = jest.fn(async () => undefined)
    const process = createNotificationResponseProcessor<Response>({
      getKey: (response) => response.id,
      handle,
      afterSuccess: async () => undefined,
    })

    await expect(process(null)).resolves.toBe(false)
    await expect(process({ id: '' })).resolves.toBe(false)
    expect(handle).not.toHaveBeenCalled()
  })
})
