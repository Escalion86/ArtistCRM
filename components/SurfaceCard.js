import cn from 'classnames'

const SurfaceCard = ({
  children,
  className,
  paddingClassName = 'p-3',
  borderClassName = 'border border-gray-200',
}) => (
  <div
    className={cn(
      'surface-card rounded-xl shadow-sm',
      borderClassName,
      paddingClassName,
      className
    )}
  >
    {children}
  </div>
)

export default SurfaceCard
