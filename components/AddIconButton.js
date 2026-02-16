import PropTypes from 'prop-types'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import IconActionButton from '@components/IconActionButton'

const AddIconButton = ({
  onClick,
  title = 'Добавить',
  disabled = false,
  size = 'md',
  variant = 'success',
  className,
  iconClassName,
  type = 'button',
}) => (
  <IconActionButton
    icon={faPlus}
    onClick={onClick}
    title={title}
    disabled={disabled}
    size={size}
    variant={variant}
    className={className}
    iconClassName={iconClassName}
    type={type}
  />
)

AddIconButton.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['success', 'neutral']),
  className: PropTypes.string,
  iconClassName: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
}

AddIconButton.defaultProps = {
  onClick: undefined,
  title: 'Добавить',
  disabled: false,
  size: 'md',
  variant: 'success',
  className: '',
  iconClassName: '',
  type: 'button',
}

export default AddIconButton
