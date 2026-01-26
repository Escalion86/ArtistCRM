import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import InputWrapper from '@components/InputWrapper'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'

const ColleaguePicker = ({
  selectedColleague,
  selectedColleagueId,
  onSelectClick,
  disabled,
  label,
  required,
  error,
  paddingY,
  fullWidth,
}) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const handleEdit = () => {
    if (selectedColleagueId && !disabled)
      modalsFunc.client?.edit(selectedColleagueId)
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
          onClick={disabled ? undefined : onSelectClick}
        >
          <div className="flex flex-col gap-0.5">
            <div className="text-base font-semibold text-gray-900">
              {[selectedColleague?.firstName, selectedColleague?.secondName]
                .filter(Boolean)
                .join(' ') || 'Не выбрано'}
            </div>
            {selectedColleague && (
              <>
                <div className="text-sm text-gray-600">
                  {selectedColleague?.phone
                    ? `+${selectedColleague.phone}`
                    : 'Телефон не указан'}
                </div>
              </>
            )}
          </div>
        </div>
        {selectedColleagueId && !disabled && (
          <button
            type="button"
            className="action-icon-button flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded border border-orange-600 bg-orange-50 text-orange-500 shadow-sm transition hover:bg-orange-100 hover:text-orange-600"
            onClick={handleEdit}
            title="Редактировать коллегу"
          >
            <FontAwesomeIcon className="h-5 w-5" icon={faPencilAlt} />
          </button>
        )}
      </div>
    </InputWrapper>
  )
}

ColleaguePicker.propTypes = {
  selectedColleague: PropTypes.shape({
    firstName: PropTypes.string,
    secondName: PropTypes.string,
    phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  selectedColleagueId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onSelectClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  paddingY: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  fullWidth: PropTypes.bool,
}

ColleaguePicker.defaultProps = {
  selectedColleague: null,
  selectedColleagueId: null,
  disabled: false,
  label: 'Коллега',
  required: false,
  error: null,
  paddingY: true,
  fullWidth: false,
}

export default ColleaguePicker
