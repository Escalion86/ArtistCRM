import Chip from '@components/Chips/Chip'
import InputImages from '@components/InputImages'
import UserNameById from '@components/UserNameById'
import { EVENT_STATUSES } from '@helpers/constants'
import formatAddress from '@helpers/formatAddress'
import formatDateTime from '@helpers/formatDateTime'
import textAge from '@helpers/textAge'
import DOMPurify from 'isomorphic-dompurify'

const EventKeyValueItem = ({ objKey, value }) =>
  value === undefined ? (
    '[не указано]'
  ) : objKey === 'description' ? (
    <div
      className="textarea ql w-full max-w-full list-disc overflow-hidden"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(value),
      }}
    />
  ) : objKey === 'tags' ? (
    Array.isArray(value) && value.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Chip key={String(tag)} text={String(tag)} color="#f3f4f6" />
        ))}
      </div>
    ) : (
      '[не указано]'
    )
  ) : objKey === 'organizerId' ? (
    <UserNameById userId={value} thin trunc={1} />
  ) : objKey === 'dateStart' || objKey === 'dateEnd' ? (
    formatDateTime(value)
  ) : objKey === 'status' ? (
    EVENT_STATUSES.find((item) => item.value === value)?.name
  ) : objKey === 'images' ? (
    <InputImages
      images={value}
      readOnly
      noMargin
      paddingY={false}
      paddingX={false}
    />
  ) : objKey === 'address' ? (
    formatAddress(value, '[не указан]')
  ) : objKey === 'usersRelationshipAccess' ? (
    value === 'no' ? (
      'Без пары'
    ) : value === 'only' ? (
      'Только с парой'
    ) : (
      'Всем'
    )
  ) : objKey === 'price' ? (
    value / 100 + ' ₽'
  ) : objKey === 'usersStatusAccess' ? (
    <div>
      <div>Не авторизован: {value?.noReg ? 'Да' : 'Нет'}</div>
      <div>Новичок: {value?.novice ? 'Да' : 'Нет'}</div>
      <div>Участник клуба: {value?.member ? 'Да' : 'Нет'}</div>
    </div>
  ) : objKey === 'usersStatusDiscount' ? (
    <div>
      <div>Новичок: {(value?.novice ?? 0) / 100 + ' ₽'}</div>
      <div>Участник клуба: {(value?.member ?? 0) / 100 + ' ₽'}</div>
    </div>
  ) : [
      'maxParticipants',
      'maxMans',
      'maxWomans',
      'maxMansNovice',
      'maxWomansNovice',
      'maxMansMember',
      'maxWomansMember',
    ].includes(objKey) ? (
    typeof value === 'number' ? (
      value + ' чел.'
    ) : (
      'Без ограничений'
    )
  ) : ['minMansAge', 'maxMansAge', 'minWomansAge', 'maxWomansAge'].includes(
      objKey
    ) ? (
    typeof value === 'number' ? (
      `${value} ${textAge(value)}`
    ) : (
      'Не задан'
    )
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

export default EventKeyValueItem
