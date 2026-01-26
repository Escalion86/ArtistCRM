'use client'

import loadingAtom from '@state/atoms/loadingAtom'
import errorAtom from '@state/atoms/errorAtom'
import PropTypes from 'prop-types'
import CardButtons from '@components/CardButtons'
import LoadingSpinner from '@components/LoadingSpinner'
import IconCheckBox from '@components/IconCheckBox'
import { useAtomValue } from 'jotai'

const formatPrice = (price) => {
  if (!price || Number(price) === 0) return 'Бесплатно'
  return `${Number(price).toLocaleString('ru-RU')} ₽/мес`
}

const formatEventsLimit = (limit) => {
  if (!Number.isFinite(limit) || Number(limit) === 0) {
    return 'Без ограничений по мероприятиям'
  }
  return `До ${limit} мероприятий в месяц`
}

const TariffCard = ({ tariff, style, onEdit, onDelete }) => {
  const loading = useAtomValue(loadingAtom('tariff' + tariff?._id))
  const error = useAtomValue(errorAtom('tariff' + tariff?._id))
  if (!tariff) return null

  return (
    <div style={style} className="px-2 py-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && onEdit?.()}
        className="group relative flex h-full w-full cursor-pointer overflow-visible rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-card"
      >
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-800 bg-opacity-80 text-2xl text-white">
            ОШИБКА
          </div>
        )}
        {loading && !error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-general bg-opacity-80">
            <LoadingSpinner />
          </div>
        )}
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(event) => event.stopPropagation()}
        >
          <CardButtons
            item={tariff}
            typeOfItem="tariff"
            minimalActions
            alwaysCompact
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <div className="flex h-full w-full flex-col gap-3 pr-24">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-gray-900">
                {tariff.title || 'Без названия'}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {formatEventsLimit(tariff.eventsPerMonth)}
              </div>
            </div>
            {tariff.hidden && (
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                Скрытый
              </span>
            )}
          </div>
          <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <IconCheckBox
              checked={tariff.allowCalendarSync}
              label="Синхронизация с календарем"
              readOnly
              noMargin
            />
            <IconCheckBox
              checked={tariff.allowStatistics}
              label="Просмотр статистики"
              readOnly
              noMargin
            />
            <IconCheckBox
              checked={tariff.allowDocuments}
              label="Счета и чеки"
              readOnly
              noMargin
            />
          </div>
        </div>
        <div className="absolute bottom-4 right-4 text-lg font-semibold text-gray-900">
          {formatPrice(tariff.price)}
        </div>
      </div>
    </div>
  )
}

TariffCard.propTypes = {
  tariff: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    eventsPerMonth: PropTypes.number,
    price: PropTypes.number,
    allowCalendarSync: PropTypes.bool,
    allowStatistics: PropTypes.bool,
    allowDocuments: PropTypes.bool,
    hidden: PropTypes.bool,
  }).isRequired,
  style: PropTypes.shape({}),
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

TariffCard.defaultProps = {
  style: null,
}

export default TariffCard
