import React from 'react'
import cn from 'classnames'

const Button = ({
  className,
  noShadow,
  fullWidth,
  children,
  onClick,
  disabled,
  addIcon = true,
  small = false,
}) => (
  <div
    className={cn(
      'group relative h-[70px] select-none tablet:h-[100px]',
      fullWidth
        ? 'w-full'
        : small
        ? 'w-[200px] tablet:w-[300px]'
        : 'w-[250px] tablet:w-[360px]',
      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      className
    )}
    onClick={() => !disabled && onClick()}
  >
    {!noShadow && (
      <div
        className={cn(
          'absolute top-[25px] h-[48px] w-full rounded-full bg-gradient-to-r from-[#692DC1] via-[47%] to-[#AC80EC] bg-size-200 bg-pos-0 opacity-80 blur-[32.5px] transition-all duration-300 group-hover:via-[#AC80EC] group-hover:to-[#A676EC] group-hover:bg-pos-100 group-active:from-[#642bb7] group-active:via-[#a270ea] group-active:to-[#9c66ea] tablet:top-[31px] tablet:h-[78px]',
          disabled ? 'grayscale' : ''
        )}
        style={{
          boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
          // filter: 'blur(32.5px)',
        }}
      />
    )}
    <div
      className={cn(
        'absolute -bottom-[7px] w-full rounded-[35px] bg-gradient-to-r from-[#5f29ae] via-[47%] to-[#9760e7] bg-size-200 bg-pos-0 transition-all duration-300 group-hover:via-[#9760e7] group-hover:to-[#9257e8] group-hover:bg-pos-100 group-active:from-[#5a27a5] group-active:via-[#8e52e6] group-active:to-[#8948e6] tablet:-bottom-[9px] tablet:rounded-[35px]',
        small ? 'h-[20px] tablet:h-[40px]' : 'h-[30px] tablet:h-[60px]',
        disabled
          ? 'brightness-150 grayscale'
          : 'group-hover:h-[20px] group-active:h-[10px] tablet:group-hover:h-[45px] tablet:group-active:h-[30px]'
      )}
      style={{
        boxShadow: '6px 6px 26px 0px rgba(255, 255, 255,0.35) inset',
      }}
    />

    <div
      className={cn(
        'absolute bottom-0 z-10 flex w-full items-center justify-center rounded-[10px] bg-gradient-to-r from-[#692DC1] via-[47%] to-[#AC80EC] bg-size-200 bg-pos-0 transition-all duration-300 group-hover:via-[#AC80EC] group-hover:to-[#A676EC] group-hover:bg-pos-100 group-active:from-[#642bb7] group-active:via-[#a270ea] group-active:to-[#9c66ea] tablet:rounded-[15px]',
        small
          ? 'h-[56px] gap-x-[14px] px-[12px] py-[18px] tablet:h-[80px]'
          : 'h-[70px] gap-x-[20px] px-[20px] py-[25px] tablet:h-[100px]',
        disabled
          ? '-bottom-[7px] brightness-150 grayscale tablet:-bottom-[9px]'
          : 'group-hover:-bottom-[3px] group-active:-bottom-[7px] tablet:group-hover:-bottom-[4px] tablet:group-active:-bottom-[9px]'
      )}
      style={{
        boxShadow:
          '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset, 0px 25px 36px 0px rgba(255, 255, 255, 0.20) inset',
      }}
    >
      <div className="text-center text-[16px] tracking-[0.64px] text-[#ffffffe6] tablet:text-[22px] tablet:leading-[125%] tablet:tracking-[0.88px]">
        {children ?? 'Заказать шоу'}
      </div>
      {addIcon && (
        <img
          className={cn(
            'object-contain opacity-60',
            !small
              ? 'h-[30px] w-[30px] tablet:h-[44px] tablet:w-[44px]'
              : 'h-[36px] w-[36px] tablet:h-[50px] tablet:w-[50px]'
          )}
          alt="logo"
          src="/img/logo_white.png"
          draggable={false}
        />
      )}
    </div>
  </div>
)

export default Button
