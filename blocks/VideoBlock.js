'use client'

import React, { useState } from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import DivContent from './components/DivContent'
import DivText from './components/DivText'
import Image from 'next/image'

const Title = ({ className }) => (
  <div
    className={cn(
      'w-[250px] text-center font-buyan text-[29px] font-bold leading-[100%] text-white phoneH:w-[280px] phoneH:text-[32px] sm:w-[320px] sm:text-[36px] md:w-[360px] md:text-[42px] tablet:w-[560px] tablet:text-[64px]',
      className
    )}
  >
    Такое ваши гости видели только{' '}
    <SpanGradientTitle>по телевизору</SpanGradientTitle>
  </div>
)

const VideoBlock = () => {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <DivContent
      noMargin
      className="mt-[60px] flex flex-col items-center md:mt-[100px]"
    >
      <Title />
      <DivText className="mb-[16px] mt-[18px] w-[290px] text-center md:mb-[57px] md:w-[450px] tablet:mb-[62px] tablet:mt-[30px] tablet:w-[590px]">
        Левитация, гипноз, чтение мыслей, исчезновение предметов и превращения —
        вы увидите то, вот что не поверят глаза.
      </DivText>
      <div
        className="absolute left-0 top-0 aspect-[1230/690] h-[345px] w-[615px] -translate-x-[55%] rotate-[105deg] tablet:top-[140px] tablet:h-[690px] tablet:w-[1230px]"
        style={{
          background: 'url("/img/smoke.png")',
          mixBlendMode: 'color-dodge',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute right-0 top-[200px] aspect-[1230/690] h-[345px] w-[615px] translate-x-1/2 rotate-[105deg] tablet:top-[396px] tablet:h-[690px] tablet:w-[1230px]"
        style={{
          background: 'url("/img/smoke.png")',
          mixBlendMode: 'color-dodge',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute -bottom-[150px] -right-[190px] h-[305px] w-[192px] rounded-full opacity-30 tablet:h-[610px] tablet:w-[384px]"
        style={{
          transform: 'rotate(-30deg)',
          background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
          mixBlendMode: 'exclusion',
          boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
          filter: 'blur(177.5px)',
        }}
      />
      <div
        className="group relative z-20 flex w-full cursor-pointer justify-center"
        onClick={showVideo ? undefined : () => setShowVideo(true)}
      >
        <div className="relative aspect-[1338/880] w-full max-w-[1338px] object-contain">
          <Image
            className="w-full"
            alt="video"
            src="/img/TV.png"
            draggable={false}
            fill
            sizes="1338px"
          />
        </div>
        {showVideo ? (
          <div className="absolute top-[2.5%] flex aspect-video w-[96.5%] max-w-[1338px] flex-col items-center">
            <iframe
              className="h-full w-full"
              title="vimeo-player"
              src="https://player.vimeo.com/video/1080274049?h=9c1e9eebde&autoplay=1&loop=1&byline=0&muted=0"
              // width="640"
              // height="360"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen"
            ></iframe>
            {/* <iframe
              className="w-full h-full"
              // width="100%"
              // height="100%"
              src="https://www.youtube.com/embed/CuoufduSlXQ?autoplay=1"
              // title="YouTube video player"
              // frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              // allowfullscreen
              allowFullScreen="allowfullscreen"
              mozallowfullscreen="mozallowfullscreen"
              msallowfullscreen="msallowfullscreen"
              oallowfullscreen="oallowfullscreen"
              webkitallowfullscreen="webkitallowfullscreen"
            ></iframe> */}
          </div>
        ) : (
          <div className="absolute top-[calc(44%)] flex -translate-y-1/2 flex-col items-center sm:top-[calc(50%-30px)] tablet:top-[calc(50%-45px)]">
            <div className="relative h-[30px] w-[30px] sm:h-[88px] sm:w-[88px] tablet:h-[110px] tablet:w-[110px]">
              <div className="absolute h-full w-full animate-ping rounded-full bg-gradient-to-r from-[#692DC1] to-[#AC80EC] bg-size-200 bg-pos-0 transition-all group-hover:via-[#AC80EC] group-hover:to-[#692DC1] group-hover:bg-pos-100" />
              <div className="absolute h-full w-full rounded-full bg-gradient-to-r from-[#692DC1] to-[#AC80EC] bg-size-200 bg-pos-0 transition-all group-hover:via-[#AC80EC] group-hover:to-[#692DC1] group-hover:bg-pos-100" />
              <div className="flex h-full w-full cursor-pointer items-center justify-center overflow-hidden">
                <svg
                  className="z-10 ml-1 h-[12px] w-[12px] sm:ml-2 sm:h-[37px] sm:w-[37px] tablet:ml-3 tablet:h-[46px] tablet:w-[46px]"
                  width="32"
                  height="36"
                  viewBox="0 0 32 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M30.5 15.4019C32.5 16.5566 32.5 19.4434 30.5 20.5981L5 35.3205C3 36.4752 0.500002 35.0318 0.500002 32.7224L0.500003 3.27757C0.500004 0.968166 3 -0.47521 5 0.679491L30.5 15.4019Z"
                    fill="white"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-[12px] select-none text-center text-[7px] font-medium text-white sm:mt-[40px] sm:text-[13px] tablet:text-[16px]">
              Посмотрите видео-презентацию от Алексея
            </div>
          </div>
        )}
      </div>
    </DivContent>
  )
}

export default VideoBlock
