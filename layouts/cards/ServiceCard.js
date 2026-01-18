'use client'

import PropTypes from 'prop-types'
import CardButtons from '@components/CardButtons'
import TextLinesLimiter from '@components/TextLinesLimiter'
import formatMinutes from '@helpers/formatMinutes'
import { modalsFuncAtom } from '@state/atoms'
import { useAtomValue } from 'jotai'

const ServiceCard = ({ service, style }) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)

  if (!service) return null

  const durationLabel = service.duration
    ? formatMinutes(service.duration)
    : 'Не указана'
  const description = service.description || 'Описание отсутствует'
  const previewImage =
    Array.isArray(service.images) && service.images.length > 0
      ? service.images[0]
      : null

  return (
    <div style={style} className="px-2 py-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => modalsFunc.service?.view(service._id)}
        className="group relative flex h-full w-full cursor-pointer overflow-visible rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow"
      >
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(event) => event.stopPropagation()}
        >
          <CardButtons
            item={service}
            typeOfItem="service"
            minimalActions
            alwaysCompact
            onEdit={() => modalsFunc.service?.edit(service._id)}
          />
        </div>

        <div className="flex h-full w-full gap-3">
          {previewImage && (
            <img
              src={previewImage}
              alt="service"
              className="h-16 w-16 min-w-[64px] rounded-lg object-cover"
            />
          )}
          <div className="flex h-full w-full flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-semibold text-gray-900">
              {service.title || 'Без названия'}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
            <div>
              <span className="font-medium">Продолжительность:</span>{' '}
              {durationLabel}
            </div>
          </div>
          <TextLinesLimiter className="text-sm text-gray-600" lines={3}>
            {description}
          </TextLinesLimiter>
          </div>
        </div>
      </div>
    </div>
  )
}

ServiceCard.propTypes = {
  service: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    description: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    duration: PropTypes.number,
  }).isRequired,
  style: PropTypes.shape({}),
}

ServiceCard.defaultProps = {
  style: null,
}

export default ServiceCard
