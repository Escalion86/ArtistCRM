export const OBLIGATION_PAYMENT_METHOD = 'obligation'

export const hasObligationPaymentMethod = (transactions = []) =>
  Array.isArray(transactions)
    ? transactions.some(
        (item) =>
          String(item?.paymentMethod || '').trim() === OBLIGATION_PAYMENT_METHOD
      )
    : false

export const getTransactionDateLabel = (paymentMethod) =>
  paymentMethod === OBLIGATION_PAYMENT_METHOD ? 'Плановая дата' : 'Дата'

export const getTransactionDateHint = (paymentMethod) =>
  paymentMethod === OBLIGATION_PAYMENT_METHOD
    ? 'Для обязательства это плановая дата исполнения.'
    : ''

export const getCloseBlockedByObligationsMessage = () =>
  'Нельзя закрыть мероприятие: есть транзакции с обязательствами. Переведите их на другой метод оплаты и укажите фактическую дату совершения.'
