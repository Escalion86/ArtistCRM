import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  renderInPortal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState(null)

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

  const updateMenuPosition = useCallback(() => {
    if (!renderInPortal) return
    const element = containerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const gap = openOnHover ? 0 : 8
    const top = rect.bottom + gap
    if (placement === 'right') {
      setMenuPosition({
        top,
        right: Math.max(0, window.innerWidth - rect.right),
      })
      return
    }
    setMenuPosition({
      top,
      left: Math.max(0, rect.left),
    })
  }, [openOnHover, placement, renderInPortal])

  useEffect(() => {
    if (!isOpen) return
    updateMenuPosition()

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
    if (renderInPortal) {
      window.addEventListener('scroll', updateMenuPosition, true)
      window.addEventListener('resize', updateMenuPosition)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      if (renderInPortal) {
        window.removeEventListener('scroll', updateMenuPosition, true)
        window.removeEventListener('resize', updateMenuPosition)
      }
    }
  }, [isOpen, renderInPortal, turnOffAutoClose, updateMenuPosition])

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

  const menuContent = isOpen ? (
    <div
      className={cn(
        'z-[80] flex items-center justify-center rounded-lg border border-gray-400 bg-white shadow-md dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800',
        strategyAbsolute && !renderInPortal
          ? cn(
              `absolute top-full ${openOnHover ? 'mt-0' : 'mt-2'}`,
              placementClassName || 'left-0'
            )
          : !renderInPortal
          ? 'mt-2 w-full'
          : '',
        padding,
        menuClassName
      )}
      style={
        renderInPortal && menuPosition
          ? {
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              right: menuPosition.right,
            }
          : undefined
      }
      aria-hidden={!isOpen}
      role="menu"
      onClick={() => {
        if (turnOffAutoClose !== 'inside') setIsOpen(false)
      }}
      {...menuHoverHandlers}
    >
      {children}
    </div>
  ) : null

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex', isOpen ? 'z-[70]' : '', className)}
      data-prevent-parent-click
      {...hoverHandlers}
    >
      <div className="w-full" onClick={handleToggle}>
        {trigger}
      </div>
      {renderInPortal && isOpen
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  )
}

export default DropDown
