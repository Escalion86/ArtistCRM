import cn from 'classnames'
import AppButton from '@components/AppButton'

const EmptyState = ({
  text,
  children,
  className,
  bordered = true,
  icon = null,
  title = null,
  hint = null,
  actionLabel = null,
  onAction = null,
  ...props
}) => {
  const hasRichContent = icon || title || hint || (actionLabel && onAction)

  return (
    <div
      className={cn(
        'flex h-full items-center justify-center text-sm text-gray-500',
        bordered &&
          'rounded-lg border border-dashed border-gray-300 bg-white p-6',
        className
      )}
      {...props}
    >
      {children ??
        (hasRichContent ? (
          <div className="flex max-w-sm flex-col items-center gap-2 px-4 py-6 text-center">
            {icon ? (
              <div
                className="empty-state-icon mb-1 flex h-12 w-12 items-center justify-center rounded-full text-[var(--ui-primary)]"
                aria-hidden="true"
              >
                {icon}
              </div>
            ) : null}
            {title ? (
              <div className="text-base font-semibold text-gray-800">
                {title}
              </div>
            ) : null}
            {hint ? (
              <div className="text-sm leading-5 text-gray-500">{hint}</div>
            ) : null}
            {actionLabel && onAction ? (
              <AppButton
                variant="primary"
                size="md"
                className="mt-2 rounded-md"
                onClick={onAction}
              >
                {actionLabel}
              </AppButton>
            ) : null}
          </div>
        ) : (
          text
        ))}
    </div>
  )
}

export default EmptyState
