import cn from 'classnames'

const NOTICE_TONES = new Set([
  'success',
  'warning',
  'error',
  'info',
  'neutral',
])

const Notice = ({
  tone = 'neutral',
  className,
  children,
  role,
  as: Component = 'div',
  ...props
}) => {
  const normalizedTone = NOTICE_TONES.has(tone) ? tone : 'neutral'

  return (
    <Component
      className={cn('ui-notice', `ui-notice--${normalizedTone}`, className)}
      role={role}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Notice
