import React from 'react'
import cn from 'classnames'
import Image from 'next/image'
import MagicanImage from './MagicanImage'

const Background = () => (
  <div className="absolute top-0 h-full w-full">
    {/* Подсветка в центре */}
    <div
      className="absolute left-1/2 top-1/2 aspect-square h-[27%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D9D9D9] opacity-10"
      style={{
        boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
        filter: 'blur(177.5px)',
      }}
    />
    {/* Подсветка руки справа */}
    <div
      className="absolute left-full top-1/2 hidden h-[491px] w-[309px] -translate-x-1/2 -translate-y-1/4 rotate-[30deg] rounded-full opacity-60 2xl:block"
      style={{
        background:
          'linear-gradient(64deg, #773FCA 0%, #8E42FF 71.51%), linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
        filter: 'blur(177.5px)',
      }}
    />
    {/* Подсветка руки слева */}
    <div
      className="absolute left-[calc(25%-400px)] top-0 h-[610px] w-[384px] -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] rounded-full opacity-60"
      style={{
        background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
        filter: 'blur(177.5px)',
      }}
    />
    {/* Фоновый белый шум */}
    {/* <div
      className="absolute w-full h-full"
      style={{
        opacity: 0.3,
        background:
          'url("/img/noise.png"), lightgray 0% 0% / 100px 100px repeat',
        mixBlendMode: 'soft-light',
      }}
    /> */}
    {/* Рука слева */}
    <div
      className="absolute left-[min(calc(5%-100px),0px)] top-[90px] z-10 hidden aspect-[289/385] max-h-[35%] w-[15%] min-w-[170px] opacity-20 md:block 2xl:opacity-100"
      style={{
        background: 'url("/img/hand1.png")',
        mixBlendMode: 'hard-light',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
      }}
    />
    {/* Рука справа */}
    <div
      className="absolute bottom-[6%] right-0 top-auto z-10 aspect-[235/303] h-[95px] w-[74px] sm:bottom-[10px] md:-bottom-0 md:h-[173px] md:w-[135px] 2xl:bottom-auto 2xl:top-[24%] 2xl:h-[303px] 2xl:w-[235px]"
      style={{
        background: 'url("/img/hand2.png")',
        mixBlendMode: 'hard-light',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
      }}
    />
    <MagicanImage />
    {/* <div
className="w-full h-full"
style={{
opacity: 0.30000001192092896,
background:
'url("/img/white_noise.png"), lightgray 0% 0% / 100px 100px repeat',
mixBlendMode: 'soft-light',
}}
></div> */}
  </div>
)

export default Background
