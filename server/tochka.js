const TOCHKA_API_URL = 'https://enter.tochka.com/uapi'

const TOCHKA_WEBHOOK_JWK = {
  kty: 'RSA',
  e: 'AQAB',
  n: 'rwm77av7GIttq-JF1itEgLCGEZW_zz16RlUQVYlLbJtyRSu61fCec_rroP6PxjXU2uLzUOaGaLgAPeUZAJrGuVp9nryKgbZceHckdHDYgJd9TsdJ1MYUsXaOb9joN9vmsCscBx1lwSlFQyNQsHUsrjuDk-opf6RCuazRQ9gkoDCX70HV8WBMFoVm-YWQKJHZEaIQxg_DU4gMFyKRkDGKsYKA0POL-UgWA1qkg6nHY5BOMKaqxbc5ky87muWB5nNk4mfmsckyFv9j1gBiXLKekA_y4UwG2o1pbOLpJS3bP_c95rm4M9ZBmGXqfOQhbjz8z-s9C11i-jmOQ2ByohS-ST3E5sqBzIsxxrxyQDTw--bZNhzpbciyYW4GfkkqyeYoOPd_84jPTBDKQXssvj8ZOj2XboS77tvEO1n1WlwUzh8HPCJod5_fEgSXuozpJtOggXBv0C2ps7yXlDZf-7Jar0UYc_NJEHJF-xShlqd6Q3sVL02PhSCM-ibn9DN9BKmD',
}

const getTochkaConfig = () => {
  const apiUrl = String(process.env.TOCHKA_API_URL || TOCHKA_API_URL).replace(/\/$/, '')
  const token = String(process.env.TOCHKA_API_TOKEN || '').trim()
  const clientId = String(process.env.TOCHKA_CLIENT_ID || '').trim()
  const customerCode = String(process.env.TOCHKA_CUSTOMER_CODE || '').trim()
  const merchantId = String(process.env.TOCHKA_MERCHANT_ID || '').trim()
  const returnUrl = String(
    process.env.TOCHKA_RETURN_URL ||
      `${process.env.DOMAIN || 'https://artistcrm.ru'}/cabinet/tariff-select?payment=tochka`
  ).trim()
  return { apiUrl, token, clientId, customerCode, merchantId, returnUrl }
}

const isTochkaConfigured = () => {
  const { token, customerCode, merchantId } = getTochkaConfig()
  return Boolean(token && customerCode && merchantId)
}

const normalizeAmount = (amount) => {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toFixed(2)
}

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '')

const getAuthHeaders = () => {
  const { token } = getTochkaConfig()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

const readPayload = async (response) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const getValue = (source, paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc?.[key], source)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return ''
}

const createTochkaRequest = async ({ pathName, method = 'GET', body }) => {
  const config = getTochkaConfig()
  if (!config.token) throw new Error('Точка не настроена')

  const response = await fetch(`${config.apiUrl}${pathName}`, {
    method,
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await readPayload(response)
  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error_description ||
        payload?.error ||
        payload?.Errors?.[0]?.message ||
        payload?.raw ||
        'Ошибка Точки'
    )
  }
  return payload
}

const buildReceiptClient = (user) => {
  const phone = normalizePhone(user?.phone)
  if (!phone) return null
  return { phone }
}

const buildReceiptItems = ({ amount, description }) => {
  const itemName = String(
    process.env.TOCHKA_RECEIPT_ITEM_NAME || description || 'Оплата ArtistCRM'
  ).slice(0, 128)

  return [
    {
      name: itemName,
      price: normalizeAmount(amount),
      quantity: 1,
      amount: normalizeAmount(amount),
      vatType: process.env.TOCHKA_VAT_TYPE || 'none',
      paymentMethod: process.env.TOCHKA_PAYMENT_METHOD || 'full_payment',
      paymentObject: process.env.TOCHKA_PAYMENT_OBJECT || 'service',
      measure: process.env.TOCHKA_MEASURE || 'piece',
    },
  ]
}

const createTochkaPayment = async ({
  amount,
  description,
  idempotenceKey,
  returnUrl,
  user,
  metadata,
}) => {
  const value = normalizeAmount(amount)
  if (!value) throw new Error('Некорректная сумма платежа')
  const config = getTochkaConfig()
  if (!isTochkaConfigured()) throw new Error('Точка не настроена')

  const client = buildReceiptClient(user)
  if (process.env.TOCHKA_SEND_RECEIPT === 'true' && !client) {
    throw new Error('Для чека Точки нужен телефон пользователя')
  }

  const body = {
    Data: {
      customerCode: config.customerCode,
      merchantId: config.merchantId,
      amount: value,
      purpose: String(description || 'Оплата ArtistCRM').slice(0, 140),
      redirectUrl: returnUrl || config.returnUrl,
      ttl: Number(process.env.TOCHKA_PAYMENT_TTL || 1440),
      taxSystemCode: process.env.TOCHKA_TAX_SYSTEM_CODE || 'npd',
      Client: client,
      Items: buildReceiptItems({ amount, description }),
      Metadata: metadata,
    },
  }
  if (idempotenceKey) body.Data.orderId = idempotenceKey
  if (process.env.TOCHKA_SEND_RECEIPT !== 'true') {
    delete body.Data.Client
    delete body.Data.Items
    delete body.Data.taxSystemCode
  }

  return createTochkaRequest({
    pathName:
      process.env.TOCHKA_SEND_RECEIPT === 'true'
        ? '/acquiring/v1.0/payments_with_receipt'
        : '/acquiring/v1.0/payments',
    method: 'POST',
    body,
  })
}

const getTochkaPayment = async (operationId) => {
  if (!operationId) return null
  return createTochkaRequest({
    pathName: `/acquiring/v1.0/payments/${encodeURIComponent(operationId)}`,
  })
}

const extractTochkaPayment = (payload) =>
  payload?.Data?.Operation ||
  payload?.Data?.Payment ||
  payload?.Data?.payment ||
  payload?.Operation ||
  payload?.Payment ||
  payload ||
  {}

const getTochkaOperationId = (payload) =>
  String(
    getValue(payload, [
      'Data.Operation.operationId',
      'Data.Operation.id',
      'Data.operationId',
      'Data.paymentId',
      'operationId',
      'id',
    ])
  ).trim()

const getTochkaPaymentUrl = (payload) =>
  String(
    getValue(payload, [
      'Data.Operation.paymentLink',
      'Data.Operation.paymentLinkUrl',
      'Data.Operation.paymentUrl',
      'Data.Operation.url',
      'Data.paymentLink',
      'Data.paymentUrl',
      'paymentLink',
      'paymentUrl',
      'url',
    ])
  ).trim()

export {
  TOCHKA_WEBHOOK_JWK,
  createTochkaPayment,
  extractTochkaPayment,
  getTochkaConfig,
  getTochkaOperationId,
  getTochkaPayment,
  getTochkaPaymentUrl,
  isTochkaConfigured,
  normalizeAmount,
}
