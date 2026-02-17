import PropTypes from 'prop-types'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import InputWrapper from '@components/InputWrapper'
import AddIconButton from '@components/AddIconButton'
import IconActionButton from '@components/IconActionButton'
import getPersonFullName from '@helpers/getPersonFullName'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'
import cn from 'classnames'

const ClientPicker = ({
  selectedClient,
  selectedClientId,
  onSelectClick,
  onCreateClick,
  onViewClick,
  onEditClick,
  disabled,
  label,
  required,
  error,
  paddingY,
  fullWidth,
  compact,
}) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const handleEdit = () => {
    if (!selectedClientId || disabled) return
    if (onEditClick) {
      onEditClick()
      return
    }
    if (onSelectClick) {
      onSelectClick()
      return
    }
    modalsFunc.client?.edit(selectedClientId)
  }
  const handleCreate = () => {
    if (disabled) return
    if (onCreateClick) {
      onCreateClick()
      return
    }
    modalsFunc.client?.add()
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
          className={cn(
            'hover:shadow-card flex flex-1 cursor-pointer justify-between rounded border border-gray-300 bg-white shadow-sm transition',
            compact ? 'px-3 py-2 text-sm' : 'p-3'
          )}
          onClick={
            disabled
              ? undefined
              : selectedClientId && onViewClick
                ? onViewClick
                : onSelectClick
          }
        >
          <div
            className={cn(
              'font-semibold text-gray-900',
              compact ? 'text-sm' : 'text-base'
            )}
          >
            {getPersonFullName(selectedClient, { fallback: 'Не выбрано' })}
          </div>
          {selectedClient && (
            <>
              <div className="text-sm text-gray-600">
                {selectedClient?.phone
                  ? `+${selectedClient.phone}`
                  : 'Телефон не указан'}
              </div>
            </>
          )}
        </div>
        {selectedClientId && !disabled && (
          <IconActionButton
            icon={faPencilAlt}
            onClick={handleEdit}
            title="Сменить клиента"
            variant="warning"
            size={compact ? 'sm' : 'lg'}
          />
        )}
        {!disabled && (
          <AddIconButton
            onClick={handleCreate}
            title="Создать нового клиента"
            size={compact ? 'sm' : 'lg'}
          />
        )}
      </div>
    </InputWrapper>
  )
}

ClientPicker.propTypes = {
  selectedClient: PropTypes.shape({
    firstName: PropTypes.string,
    secondName: PropTypes.string,
    phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  selectedClientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectClick: PropTypes.func.isRequired,
  onCreateClick: PropTypes.func,
  onViewClick: PropTypes.func,
  onEditClick: PropTypes.func,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  paddingY: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  fullWidth: PropTypes.bool,
  compact: PropTypes.bool,
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
  compact: false,
  onCreateClick: null,
  onViewClick: null,
  onEditClick: null,
}

export default ClientPicker
