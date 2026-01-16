'use client'

import React from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Button from './components/Button'
import Reviews from './galleryComponents/Reviews'
import { useSetAtom } from 'jotai'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import BackLight from './components/BackLight'
import yandexAimAtom from '@state/atoms/yandexAimAtom'

const Title = ({ className }) => (
  <div
    className={cn(
      'w-[320px] text-center font-buyan text-[29px] font-bold leading-[100%] text-white phoneH:text-[32px] sm:w-[420px] sm:text-[36px] md:w-[500px] md:text-[42px] tablet:w-[760px] tablet:text-[64px] xl:w-[780px]',
      className
    )}
  >
    После выступления люди надолго остаются{' '}
    <SpanGradientTitle>под впечатлениями</SpanGradientTitle>
  </div>
)

const ReviewsBlock = () => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)
  return (
    <div className="relative mt-[32px] flex w-full flex-col items-center md:mt-[72px]">
      <Title />
      <div className="relative mt-[25px] md:mt-[60px]">
        <BackLight
          className={cn(
            'scale-[50%]',
            '-left-[40px] top-[60px] -translate-x-1/2 -translate-y-1/2',
            'md:-left-[120px] md:-top-[60px] md:-translate-x-1/2 md:-translate-y-1/2 md:scale-[100%]',
            'xl:left-[60px] xl:top-0 xl:-translate-x-1/2 xl:-translate-y-1/2'
          )}
          opacity={40}
        />
        <BackLight
          className={cn(
            'bottom-auto scale-[50%]',
            '-right-[80px] top-[50%] -translate-y-1/2 translate-x-1/2',
            'md:right-[120px] md:top-[80px] md:-translate-y-1/2 md:translate-x-1/2 md:scale-[100%]',
            'xl:bottom-0 xl:right-[60px] xl:translate-y-[40px]'
          )}
          opacity={20}
        />
        <Reviews />
      </div>

      <Button
        className="mt-[35px] md:mt-[60px]"
        onClick={() => {
          setYandexAim('zakaz_show')
          setShowModalZakaz(true)
        }}
      />
    </div>
  )
}

export default ReviewsBlock
