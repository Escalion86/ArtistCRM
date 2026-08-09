import PropTypes from 'prop-types'
import cn from 'classnames'

const AiFieldHighlight = ({ active, children, className }) => (
  <div
    className={cn(
      'relative transition-[background-color,box-shadow] duration-200',
      active &&
        'ai-field-highlight rounded-lg bg-violet-50/80 ring-2 ring-violet-400 ring-offset-2 ring-offset-white',
      className
    )}
    data-ai-filled={active ? 'true' : undefined}
  >
    {children}
  </div>
)

AiFieldHighlight.propTypes = {
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}

AiFieldHighlight.defaultProps = {
  active: false,
  className: '',
}

export default AiFieldHighlight
