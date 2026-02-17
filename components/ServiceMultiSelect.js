import PropTypes from 'prop-types'
import CheckBox from '@components/CheckBox'
import AddIconButton from '@components/AddIconButton'
import InputWrapper from '@components/InputWrapper'
import servicesAtom from '@state/atoms/servicesAtom'
import { useAtomValue } from 'jotai'

const ServiceMultiSelect = ({
  value,
  onChange,
  onCreate,
  error,
  required,
  onClearError,
}) => {
  const services = useAtomValue(servicesAtom)
  const selectedIds = Array.isArray(value) ? value : []

  const toggleService = (serviceId) => {
    if (onClearError) onClearError()
    const isSelected = selectedIds.includes(serviceId)
    onChange(
      isSelected
        ? selectedIds.filter((id) => id !== serviceId)
        : [...selectedIds, serviceId]
    )
  }

  return (
    <InputWrapper label="Услуги" required={required} error={error}>
      <div className="flex items-center w-full gap-x-1">
        <div className="flex flex-col flex-1 gap-1">
          {services.length === 0 ? (
            <div className="text-sm text-gray-500">Услуги не добавлены</div>
          ) : (
            services.map((service) => (
              <CheckBox
                key={service._id}
                checked={selectedIds.includes(service._id)}
                label={service.title}
                noMargin
                onClick={() => toggleService(service._id)}
              />
            ))
          )}
        </div>
        {onCreate && (
          <AddIconButton
            onClick={onCreate}
            title="Добавить услугу"
            size="md"
          />
        )}
      </div>
    </InputWrapper>
  )
}

ServiceMultiSelect.propTypes = {
  value: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ),
  onChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  required: PropTypes.bool,
  onClearError: PropTypes.func,
}

ServiceMultiSelect.defaultProps = {
  value: [],
  onCreate: null,
  error: null,
  required: false,
  onClearError: null,
}

export default ServiceMultiSelect
