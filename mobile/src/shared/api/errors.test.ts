import { ApiError, parseApiError } from './errors'

describe('parseApiError', () => {
  it('сохраняет код, тип и поле стандартизированной ошибки', async () => {
    const response = {
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'INVALID_PHONE', type: 'validation', message: 'Некорректный телефон', field: 'phone' },
      }),
    } as unknown as Response
    const error = await parseApiError(response)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('INVALID_PHONE')
    expect(error.field).toBe('phone')
  })

  it('понятно сообщает об отсутствующем mobile API вместо неизвестной ошибки', async () => {
    const response = {
      status: 404,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      json: async () => { throw new SyntaxError('HTML') },
    } as unknown as Response

    const error = await parseApiError(response)
    expect(error.message).toContain('Мобильный API пока недоступен')
  })
})
