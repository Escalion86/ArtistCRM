import cn from 'classnames'
import { motion } from 'framer-motion'
import Image from 'next/image'

export const LoadingSpinner = ({
  className,
  size = 'md',
  text = null,
  heightClassName = 'h-full',
}) => {
  const widthHeight =
    size === 'xxs'
      ? 24
      : size === 'xs'
      ? 30
      : size === 'sm'
      ? 40
      : size === 'md'
      ? 50
      : size === 'lg'
      ? 100
      : 60
  return (
    <div
      className={cn(
        'flex max-h-full flex-col items-center justify-center',
        heightClassName,
        className
      )}
    >
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{
          height: widthHeight * 1.25,
          maxHeight: widthHeight * 1.25,
          width: widthHeight * 1.25,
          maxWidth: widthHeight * 1.25,
        }}
      >
        <div
          style={{
            height: widthHeight * 1.25,
            maxHeight: widthHeight * 1.25,
            width: widthHeight * 1.25,
            maxWidth: widthHeight * 1.25,
          }}
          className="aspect-1 border-general absolute bottom-auto left-auto right-auto top-auto h-[95%] animate-spin rounded-full border-l-2"
        />
        <motion.div
          animate={{ scale: [1, 1, 1.15, 1.05, 1.15, 1] }}
          transition={{
            duration: 1.3,
            repeat: Infinity,
            times: [0, 0.6, 0.7, 0.8, 0.9, 1],
          }}
          className="flex h-full items-center justify-center"
        >
          <Image
            className="aspect-1 h-[70%] max-h-[80%] w-[70%] object-contain"
            style={{ maxHeight: widthHeight, maxWidth: widthHeight }}
            src="/img/logo.png"
            alt="Логотип"
            width={widthHeight}
            height={widthHeight}
            priority
          />
        </motion.div>
      </div>
      {text && <div className="animate-pulse text-lg font-bold">{text}</div>}
    </div>
  )
}

export default LoadingSpinner
