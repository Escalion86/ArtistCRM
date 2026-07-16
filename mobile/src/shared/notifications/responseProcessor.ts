type ResponseResult = { eventChanged?: boolean } | void

type ProcessorOptions<Response> = {
  getKey: (response: Response) => string
  handle: (response: Response) => Promise<ResponseResult>
  afterSuccess: (result: ResponseResult) => Promise<void>
}

export const createNotificationResponseProcessor = <Response>({
  getKey,
  handle,
  afterSuccess,
}: ProcessorOptions<Response>) => {
  const processed = new Set<string>()
  const inFlight = new Set<string>()

  return async (response: Response | null) => {
    if (!response) return false
    const key = getKey(response)
    if (!key || processed.has(key) || inFlight.has(key)) return false

    inFlight.add(key)
    try {
      const result = await handle(response)
      processed.add(key)
      await afterSuccess(result)
      return true
    } finally {
      inFlight.delete(key)
    }
  }
}

