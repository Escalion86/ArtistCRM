import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cn from 'classnames'

const DropDown = ({
  trigger,
  children,
  menuPadding = 'md',
  menuClassName,
  openOnHover = false,
  turnOffAutoClose = false,
  strategyAbsolute = true,
  className,
  placement,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const padding = useMemo(() => {
    switch (menuPadding) {
      case 'md':
        return 'p-2'
      case 'sm':
        return 'p-1'
      case 'lg':
        return 'p-3'
      default:
        return ''
    }
  }, [menuPadding])

  const placementClassName = useMemo(() => {
    if (placement === 'right') {
      return 'right-0'
    }
    if (placement === 'left') {
      return 'left-0'
    }
    return ''
  }, [placement])

  const handleToggle = useCallback(() => {
    if (openOnHover) return
    setIsOpen((prev) => !prev)
  }, [openOnHover])

  useEffect(() => {
    if (!isOpen) return

    const handleClick = (event) => {
      const element = containerRef.current
      if (!element) return

      const isInside = element.contains(event.target)

      if (isInside) {
        if (turnOffAutoClose !== 'inside') {
          setIsOpen(false)
        }
        return
      }

      if (turnOffAutoClose !== 'outside') {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, turnOffAutoClose])

  const hoverHandlers = openOnHover
    ? {
        onMouseEnter: () => setIsOpen(true),
        onMouseLeave: (event) => {
          const element = containerRef.current
          if (!element) {
            setIsOpen(false)
            return
          }
          const relatedTarget = event.relatedTarget
          if (relatedTarget instanceof Node && element.contains(relatedTarget))
            return
          setIsOpen(false)
        },
      }
    : {}

  const menuHoverHandlers = openOnHover
    ? {
        onMouseEnter: () => setIsOpen(true),
        onMouseLeave: () => setIsOpen(false),
      }
    : {}

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex', className)}
      data-prevent-parent-click
      {...hoverHandlers}
    >
      <div className="w-full" onClick={handleToggle}>
        {trigger}
      </div>
      {isOpen ? (
        <div
          className={cn(
            'z-50 flex items-center justify-center rounded-lg border border-gray-400 bg-white shadow-md dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800',
            strategyAbsolute
              ? cn(
                  `absolute top-full ${openOnHover ? 'mt-0' : 'mt-2'}`,
                  placementClassName || 'left-0'
                )
              : 'mt-2 w-full',
            padding,
            menuClassName
          )}
          aria-hidden={!isOpen}
          role="menu"
          {...menuHoverHandlers}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default DropDown
