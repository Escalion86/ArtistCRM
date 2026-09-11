import cn from 'classnames'

const InputAffixDivider = ({ className, thick = false }) => (
  <div
    className={cn(
      'w-0 shrink-0 self-stretch border-input',
      thick ? 'border-l-2' : 'border-l',
      className
    )}
  />
)

export default InputAffixDivider
