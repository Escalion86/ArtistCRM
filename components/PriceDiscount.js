import cn from 'classnames'

const PriceDiscount = ({
  item,
  className,
  prefix,
  vertical,
  priceForStatus,
  mobileVertical,
}) => {
  if (!item) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-x-1', className)}>
      {item.price ? (
        <div className="laptop:text-xl flex flex-nowrap items-center gap-x-1 text-lg font-bold">
          {prefix && <span className="font-bold tablet:block">{prefix}</span>}
          <span className="whitespace-nowrap">{item.price / 100 + ' ₽'}</span>
        </div>
      ) : (
        <div className="whitespace-normal text-lg font-bold uppercase">
          Бесплатно
        </div>
      )}
    </div>
  )
}

export default PriceDiscount
