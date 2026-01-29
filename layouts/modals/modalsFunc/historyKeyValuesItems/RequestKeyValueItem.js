import formatAddress from '@helpers/formatAddress'
import formatDateTime from '@helpers/formatDateTime'
import { REQUEST_STATUSES } from '@helpers/constants'

const RequestKeyValueItem = ({ objKey, value }) =>
  value === undefined ? (
    '[не указано]'
  ) : ['eventDate', 'createdAt', 'updatedAt'].includes(objKey) ? (
    formatDateTime(value)
  ) : objKey === 'status' ? (
    REQUEST_STATUSES.find((item) => item.value === value)?.name
  ) : objKey === 'address' ? (
    formatAddress(value, '[не указан]')
  ) : objKey === 'servicesIds' || objKey === 'contactChannels' ? (
    Array.isArray(value) && value.length > 0 ? value.join(', ') : '[не указано]'
  ) : objKey === 'contractSum' ? (
    typeof value === 'number' ? value.toLocaleString('ru-RU') + ' ₽' : value
  ) : objKey === 'calendarSyncError' ? (
    value === 'calendar_sync_unavailable'
      ? 'Синхронизация недоступна по тарифу'
      : value === 'calendar_sync_failed'
        ? 'Ошибка синхронизации'
        : value
  ) : value !== null && typeof value === 'object' ? (
    <pre>{JSON.stringify(value)}</pre>
  ) : typeof value === 'boolean' ? (
    value ? (
      'Да'
    ) : (
      'Нет'
    )
  ) : (
    value
  )

export default RequestKeyValueItem
