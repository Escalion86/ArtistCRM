'use client'

import React from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Gallery from './galleryComponents/Gallery'
import BackLight from './components/BackLight'

const Title = ({ className }) => (
  <div
    className={cn(
      'font-buyan text-[29px] font-bold leading-[100%] text-white phoneH:text-[32px] sm:text-[36px] md:text-[42px] tablet:text-[64px]',
      className
    )}
  >
    <SpanGradientTitle>Фотографии</SpanGradientTitle> с выступлений
  </div>
)

const GalleryBlock2 = () => {
  return (
    <div className="relative mb-10 mt-[64px] flex w-full flex-col items-center md:mt-[137px] tablet:mb-32 xl:mt-[240px]">
      <BackLight className="-left-[10px] -top-[190px] scale-[71.58%] md:-top-[90px] md:left-auto md:scale-[100%]" />
      <Title />
      {/* <DivContent className="flex flex-col items-center gap-y-[20px]"> */}
      <div className="relative z-10 mt-[35px] w-full md:mt-[65px]">
        <Gallery type={2} folder="gallery2" imagesCount={5} />
      </div>
      {/* </DivContent> */}
    </div>
  )
}

export default GalleryBlock2
