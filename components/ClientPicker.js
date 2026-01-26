import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import InputWrapper from '@components/InputWrapper'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'

const ClientPicker = ({
  selectedClient,
  selectedClientId,
  onSelectClick,
  onCreateClick,
  onViewClick,
  disabled,
  label,
  required,
  error,
  paddingY,
  fullWidth,
}) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const handleEdit = () => {
    if (selectedClientId && !disabled) modalsFunc.client?.edit(selectedClientId)
  }

  return (
    <InputWrapper
      label={label}
      required={required}
      error={error}
      paddingY={paddingY}
      fullWidth={fullWidth}
      disabled={disabled}
    >
      <div className="flex w-full flex-wrap items-center gap-2">
        <div
          className="flex flex-1 cursor-pointer justify-between rounded border border-gray-300 bg-white p-3 shadow-sm transition hover:shadow-card"
          onClick={
            disabled
              ? undefined
              : selectedClientId && onViewClick
              ? onViewClick
              : onSelectClick
          }
        >
          <div className="text-base font-semibold text-gray-900">
            {[selectedClient?.firstName, selectedClient?.secondName]
              .filter(Boolean)
              .join(' ') || 'Не выбрано'}
          </div>
          {selectedClient && (
            <>
              <div className="text-sm text-gray-600">
                {selectedClient?.priorityContact || 'Контакт не указан'}
              </div>
              <div className="text-sm text-gray-600">
                {selectedClient?.phone
                  ? `+${selectedClient.phone}`
                  : 'Телефон не указан'}
              </div>
            </>
          )}
        </div>
        {selectedClientId && !disabled && (
          <button
            type="button"
            className="action-icon-button flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded border border-orange-600 bg-orange-50 text-orange-500 shadow-sm transition hover:bg-orange-100 hover:text-orange-600"
            onClick={handleEdit}
            title="Редактировать клиента"
          >
            <FontAwesomeIcon className="h-5 w-5" icon={faPencilAlt} />
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            className="action-icon-button flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-700"
            onClick={onCreateClick}
            title="Создать нового клиента"
          >
            <FontAwesomeIcon className="h-5 w-5" icon={faPlus} />
          </button>
        )}
      </div>
    </InputWrapper>
  )
}

ClientPicker.propTypes = {
  selectedClient: PropTypes.shape({
    firstName: PropTypes.string,
    secondName: PropTypes.string,
    priorityContact: PropTypes.string,
    phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  selectedClientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectClick: PropTypes.func.isRequired,
  onCreateClick: PropTypes.func,
  onViewClick: PropTypes.func,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  paddingY: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  fullWidth: PropTypes.bool,
}

ClientPicker.defaultProps = {
  selectedClient: null,
  selectedClientId: null,
  disabled: false,
  label: 'Клиент',
  required: false,
  error: null,
  paddingY: true,
  fullWidth: false,
  onCreateClick: null,
  onViewClick: null,
}

export default ClientPicker
