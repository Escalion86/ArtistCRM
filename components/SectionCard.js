import cn from 'classnames'

const SectionCard = ({ as: Component = 'div', className, children, ...props }) => {
  return (
    <Component
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export default SectionCard
