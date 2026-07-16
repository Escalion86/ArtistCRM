const entityLabels: Record<string, string> = {
  events: 'Мероприятие',
  clients: 'Клиент',
  transactions: 'Транзакция',
  services: 'Услуга',
  serviceGroups: 'Группа услуг',
}

const fieldLabels: Record<string, string> = {
  eventDate: 'Дата и время начала',
  dateEnd: 'Дата и время окончания',
  status: 'Статус',
  clientId: 'Клиент',
  contractSum: 'Сумма договора',
  depositExpectedAmount: 'Ожидаемый задаток',
  waitDeposit: 'Ожидается задаток',
  additionalEvents: 'Следующие контакты',
  otherContacts: 'Дополнительные клиенты',
  servicesIds: 'Услуги',
  description: 'Комментарий',
  address: 'Адрес',
  date: 'Дата',
  sum: 'Сумма',
  paymentMethod: 'Способ оплаты',
  category: 'Категория',
  firstName: 'Имя',
  secondName: 'Фамилия',
  phone: 'Телефон',
}

const statusLabels: Record<string, string> = {
  draft: 'Заявка',
  active: 'Подтверждено',
  canceled: 'Отменено',
  closed: 'Закрыто',
}

const moneyPaths = new Set(['contractSum', 'depositExpectedAmount', 'sum'])
const datePaths = new Set(['eventDate', 'dateEnd', 'date'])

export const getConflictEntityLabel = (entityType: string) =>
  entityLabels[entityType] || 'Запись'

export const getConflictFieldLabel = (path: string) => fieldLabels[path] || path

const formatDate = (value: string) => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) return `${dateOnly[3]}.${dateOnly[2]}.${dateOnly[1]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

const formatArrayItem = (item: unknown, labelsById: Record<string, string>) => {
  if (typeof item === 'string') return labelsById[item] || item
  if (!item || typeof item !== 'object') return String(item)
  const value = item as Record<string, unknown>
  const title = String(
    value.title || value.name || labelsById[String(value.clientId || '')] || ''
  )
  const date = value.date ? formatDate(String(value.date)) : ''
  const comment = String(value.comment || value.description || '')
  return (
    [title, date, comment].filter(Boolean).join(' · ') || JSON.stringify(value)
  )
}

export const formatConflictValue = (
  path: string,
  value: unknown,
  labelsById: Record<string, string> = {}
) => {
  if (value === null || value === undefined || value === '')
    return 'Не заполнено'
  if (path === 'status' && typeof value === 'string') {
    return statusLabels[value] || value
  }
  if (path === 'clientId' && typeof value === 'string') {
    return labelsById[value] || 'Клиент больше недоступен'
  }
  if (moneyPaths.has(path) && typeof value === 'number') {
    return `${value.toLocaleString('ru-RU')} ₽`
  }
  if (datePaths.has(path) && typeof value === 'string') return formatDate(value)
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) {
    if (!value.length) return 'Нет элементов'
    return value
      .map(
        (item, index) => `${index + 1}. ${formatArrayItem(item, labelsById)}`
      )
      .join('\n')
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}
