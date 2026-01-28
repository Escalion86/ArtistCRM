import cn from 'classnames'

const HeaderActions = ({
  left,
  right,
  className,
  leftClassName,
  rightClassName,
}) => {
  return (
    <div className={cn('flex flex-1 items-center justify-between', className)}>
      <div className={cn('flex items-center gap-3', leftClassName)}>{left}</div>
      <div className={cn('flex items-center gap-3', rightClassName)}>
        {right}
      </div>
    </div>
  )
}

export default HeaderActions
