import React from 'react'
import cn from 'classnames'

const DivContent = ({
  children,
  className,
  noMargin = false,
  fullWidth = true,
  ...props
}) => (
  <div
    className={cn(
      'relative min-w-[375px] max-w-[1264px] px-[18px] md:px-[52px]',
      noMargin ? '' : 'mt-12 md:mt-[124px] tablet:mt-10 2xl:mt-20',
      fullWidth ? 'w-full' : '',
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export default DivContent
