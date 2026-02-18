import InputImages from '@components/InputImages'
import { USERS_ROLES, USERS_STATUSES } from '@helpers/constants'
import formatDateTime from '@helpers/formatDateTime'

const Item = ({ title, text }) => (
  <div className="flex gap-x-1">
    <div className="flex">
      <div className="font-bold">{title}</div>:
    </div>
    <div>{text}</div>
  </div>
)

const UserKeyValueItem = ({ objKey, value }) =>
  value === null || value === undefined || value === '' ? (
    '[не указано]'
  ) : [
      'firstName',
      'secondName',
      'thirdName',
      'email',
      'telegram',
      'instagram',
      'vk',
      'registrationType',
      'billingStatus',
    ].includes(objKey) ? (
    value
  ) : ['phone', 'whatsapp', 'viber'].includes(objKey) ? (
    `+${value}`
  ) : [
      'lastActivityAt',
      'prevActivityAt',
      'trialActivatedAt',
      'trialEndsAt',
      'tariffActiveUntil',
      'nextChargeAt',
    ].includes(objKey) ? (
    formatDateTime(value)
  ) : objKey === 'password' ? (
    value ? (
      <div className="text-gray-500">{'[пароль скрыт]'}</div>
    ) : (
      '[не задан]'
    )
  ) : objKey === 'role' ? (
    USERS_ROLES.find((item) => item.value === value)?.name
  ) : objKey === 'status' ? (
    USERS_STATUSES.find((item) => item.value === value)?.name
  ) : objKey === 'images' ? (
    <InputImages
      images={value}
      readOnly
      noMargin
      paddingY={false}
      paddingX={false}
    />
  ) : objKey === 'notifications' ? (
    <div className="flex flex-col gap-y-1">
      <Item
        title="Телеграм оповещения активированы"
        text={value.telegram?.active ? 'Да' : 'Нет'}
      />
      <Item
        title="Телеграм подключен"
        text={value.telegram?.id ? 'Да' : 'Нет'}
      />
    </div>
  ) : objKey === 'balance' ? (
    `${Number(value || 0).toLocaleString('ru-RU')} ₽`
  ) : typeof value === 'object' ? (
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

export default UserKeyValueItem
