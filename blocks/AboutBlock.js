'use client'

import React from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import DivContent from './components/DivContent'
import BackLight from './components/BackLight'
// import Image from 'next/image'

const Title = ({ className }) => (
  <div
    className={cn(
      'font-buyan phoneH:text-[32px] tablet:text-[56px] text-center text-[29px] leading-[100%] font-bold whitespace-nowrap text-white sm:text-[36px] md:text-[42px] lg:text-left',
      className
    )}
  >
    <span className="hidden whitespace-nowrap lg:block">
      <SpanGradientTitle>более 20 лет дарит эмоции</SpanGradientTitle> людям
    </span>
    <SpanGradientTitle className="lg:hidden">
      более 20 лет
      <br />
    </SpanGradientTitle>
    <span className="whitespace-nowrap lg:hidden">
      <SpanGradientTitle>дарит эмоции</SpanGradientTitle> людям
      <br />
    </span>
    при помощи иллюзий
  </div>
)

const ListItem = ({ children }) => (
  <div className="flex items-center justify-start gap-x-[14px] md:gap-x-[20px]">
    <svg
      className="w-[20px]"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <g clipPath="url(#clip0_72_1965)" filter="url(#filter0_i_72_1965)">
        <path
          d="M5.91814 16.115C7.67533 16.115 9.17702 14.8629 10.0019 14C10.8276 14.8629 12.3251 16.115 14.0823 16.115C17.1077 16.115 19.2227 14.0051 19.2227 10.9856C19.2227 7.65651 16.5975 5.50422 14.0586 3.42385C12.8598 2.44077 11.6178 1.42554 10.666 0.296946C10.5873 0.203792 10.4892 0.1289 10.3786 0.0774726C10.268 0.0260455 10.1476 -0.000682636 10.0256 -0.000854492L9.97652 -0.000854492C9.85444 -0.000578416 9.73388 0.0261919 9.62316 0.0776075C9.51244 0.129023 9.41421 0.203859 9.33523 0.296946C8.38261 1.42385 7.14149 2.43992 5.94268 3.423C3.40291 5.50338 0.776855 7.65481 0.776855 10.9848C0.777701 14.0051 2.89107 16.115 5.91814 16.115Z"
          fill="url(#paint0_linear_72_1965)"
        />
        <path
          d="M6.86084 19.8255C8.93776 19.4579 11.0631 19.4579 13.14 19.8255C11.063 16.702 10.0004 10.6605 10.0004 10.6605C10.0004 10.6605 8.9539 16.702 6.86084 19.8255Z"
          fill="url(#paint1_linear_72_1965)"
        />
      </g>
      <defs>
        <filter
          id="filter0_i_72_1965"
          x="0"
          y="-0.000854492"
          width="22"
          height="22"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="2" dy="2" />
          <feGaussianBlur stdDeviation="2.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_72_1965"
          />
        </filter>
        <linearGradient
          id="paint0_linear_72_1965"
          x1="0.776856"
          y1="14.2349"
          x2="18.7002"
          y2="13.8771"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#692DC1" />
          <stop offset="1" stopColor="#AC80EC" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_72_1965"
          x1="6.86084"
          y1="18.7563"
          x2="12.9637"
          y2="18.6833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#692DC1" />
          <stop offset="1" stopColor="#AC80EC" />
        </linearGradient>
        <clipPath id="clip0_72_1965">
          <rect
            width="20"
            height="20"
            fill="white"
            transform="translate(0 -0.000854492)"
          />
        </clipPath>
      </defs>
    </svg>
    <div className="flex-1 text-[13px] font-normal text-white md:text-[19px]">
      {children}
    </div>
  </div>
)

const SpanGold = ({ children }) => (
  <span
    style={{
      background: 'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}
  >
    {children}
  </span>
)

const List = ({ className }) => (
  <div
    className={cn(
      'flex max-w-[400px] min-w-[340px] flex-col gap-y-[18px] sm:max-w-[460px] sm:min-w-[460px] md:max-w-[600px] md:min-w-[600px]',
      className
    )}
  >
    <ListItem>
      Участник <SpanGold>телевизионного шоу</SpanGold> «Все, кроме обычного» на
      <SpanGold>ТНТ</SpanGold>.
    </ListItem>
    <ListItem>
      Обладатель <SpanGold>Высшей международной награды</SpanGold> в области
      иллюзионного искусства — кубка Мерлина.
    </ListItem>
    <ListItem>
      <SpanGold>Более 22 лет работы</SpanGold> и{' '}
      <SpanGold>3000+ выступлений</SpanGold> разного масштаба: от семейного
      формата до больших шоу-программ.
    </ListItem>
    <ListItem>
      <SpanGold>Двукратный чемпион</SpanGold> Всероссийского конкурса
      Micromagic.
    </ListItem>
    <ListItem>
      Выступает и проводит <SpanGold>шоу за границей</SpanGold>: Болгария,
      Вьетнам, Казахстан, Абхазия, Турция.
    </ListItem>
    <ListItem>
      Открыл единственную в России <SpanGold>школу по фокусам</SpanGold> и
      сценическому искусству для детей — Академию Юных Волшебников.
    </ListItem>
    <ListItem>
      <SpanGold>Член закрытого клуба</SpanGold> фокусников России и СНГ.
    </ListItem>
  </div>
)

const ImgPhone = ({
  className,
  imgClassName,
  imgSizeClassName,
  width,
  height,
}) => (
  <div className={cn('relative', imgSizeClassName, className)}>
    {/* <img
    className="absolute"
    alt="gif"
    src="/img/bgCardsSpring.png"
    draggable={false}
  /> */}
    {/* <div
      className="top-0 left-0 absolute rounded-[20px] opacity-10 w-full h-full rotate-[5deg]"
      style={{
        background:
          'linear-gradient(320deg, rgba(96, 139, 246, 0.60) 0%, rgba(96, 139, 246, 0.00) 32.66%, rgba(134, 123, 255, 0.00) 78.17%, rgba(134, 123, 255, 0.60) 100%), rgba(0, 0, 0, 0.10)',
        backgroundBlendMode: 'color-dodge, normal',
        boxShadow: '4px 4px 25px 0px rgba(255, 255, 255, 0.15) inset',
      }}
    /> */}
    <svg
      className={cn(
        'absolute top-1/2 left-1/2 h-[113%] w-[113%] -translate-x-1/2 -translate-y-1/2 rotate-[5deg]'
      )}
      viewBox="0 0 520 729"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_i_72_1947)">
        <g opacity="0.1">
          <rect
            x="30.0005"
            y="19.3385"
            width="460"
            height="690"
            rx="20"
            fill="black"
            fillOpacity="0.1"
          />
          <rect
            x="30.0005"
            y="19.3385"
            width="460"
            height="690"
            rx="20"
            fill="url(#paint0_linear_72_1947)"
            fillOpacity="0.6"
            style={{ mixBlendMode: 'color-dodge' }}
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_i_72_1947"
          x="0.806641"
          y="0.605469"
          width="522.387"
          height="731.466"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="4" dy="4" />
          <feGaussianBlur stdDeviation="12.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_72_1947"
          />
        </filter>
        <linearGradient
          id="paint0_linear_72_1947"
          x1="490"
          y1="758.339"
          x2="75.0004"
          y2="19.3385"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#608BF7" />
          <stop offset="0.326583" stopColor="#608BF6" stopOpacity="0" />
          <stop offset="0.781706" stopColor="#867BFF" stopOpacity="0" />
          <stop offset="1" stopColor="#867BFF" />
        </linearGradient>
      </defs>
    </svg>

    <div
      className={cn(
        'relative aspect-[232/428] min-w-[calc(100%+12px)] overflow-hidden sm:min-w-[calc(100%+18px)]',
        imgClassName,
        imgSizeClassName
      )}
    >
      <video
        src="/img/promo2.mp4"
        style={{
          background:
            'linear-gradient(320deg, rgba(96, 139, 246, 0.60) 0%, rgba(96, 139, 246, 0.00) 32.66%, rgba(134, 123, 255, 0.00) 78.17%, rgba(134, 123, 255, 0.60) 100%), rgba(0, 0, 0, 0.06)',
          backgroundBlendMode: 'color-dodge, normal',
        }}
        draggable={false}
        className={cn(
          'relative z-10 object-cover',
          imgClassName,
          imgSizeClassName
        )}
        loop
        autoPlay
        muted
        playsInline
        preload="metadata"
        controlsList="nodownload"
        width={width}
        height={height}
      />
      <img
        className={cn(
          'absolute top-0 left-0 object-cover',
          imgClassName,
          imgSizeClassName
        )}
        // className="absolute -left-[6px] -top-[22px] z-50 object-fill sm:-left-[8px] sm:-top-[36px]"
        // style={{ width: width - 8, minWidth: width - 8, height: height + 68 }}
        alt="promo2_pic"
        src="/img/promo2.png"
        draggable={false}
        width={width}
        height={height}
      />
    </div>
    <img
      className="absolute -top-[22px] -left-[6px] z-30 aspect-[232/428] min-w-[calc(100%+12px)] object-fill sm:-top-[36px] sm:-left-[8px] sm:min-w-[calc(100%+18px)]"
      // className="absolute -left-[6px] -top-[22px] z-50 object-fill sm:-left-[8px] sm:-top-[36px]"
      // style={{ width: width - 8, minWidth: width - 8, height: height + 68 }}
      alt="phone"
      src="/img/phone.png"
      draggable={false}
      // width={width + 100}
      // height={height + 200}
    />
    {/* <Image
      // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
      className={cn('relative object-cover', imgClassName, imgSizeClassName)}
      alt="gif"
      src="/img/cardsSpring.gif"
      style={{
        background:
          'linear-gradient(320deg, rgba(96, 139, 246, 0.60) 0%, rgba(96, 139, 246, 0.00) 32.66%, rgba(134, 123, 255, 0.00) 78.17%, rgba(134, 123, 255, 0.60) 100%), rgba(0, 0, 0, 0.06)',
        backgroundBlendMode: 'color-dodge, normal',
      }}
      draggable={false}
      width={width}
      height={height}
    /> */}
  </div>
)

const AboutBlock = () => {
  return (
    <div className="relative flex w-full justify-center">
      <img
        // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
        className="absolute top-0 left-0 w-[25%] object-cover opacity-20 md:-top-[290px] md:left-[min(calc(3%-60px),0px)] md:w-[320px] md:opacity-50"
        alt="glass"
        src="/img/broken_glass_left.png"
        draggable={false}
      />
      <img
        // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
        className="absolute right-0 bottom-[350px] w-[25%] object-cover opacity-20 sm:bottom-[650px] md:right-[min(calc(3%-60px),0px)] md:bottom-[240px] md:w-[300px] md:opacity-50 xl:-bottom-[240px]"
        alt="glass"
        src="/img/broken_glass_right.png"
        draggable={false}
      />
      <BackLight
        className="-top-[80px] left-[calc(7.5%-300px)] md:-top-[90px]"
        opacity={30}
      />
      <BackLight
        className="-top-[80px] right-0 md:top-[460px] md:translate-x-1/2 xl:top-[220px]"
        opacity={10}
      />

      {/* broken_glass_ */}
      <DivContent className="flex flex-col items-center gap-y-[20px]">
        <div className="flex flex-wrap justify-center gap-x-[100px] gap-y-[78px] xl:flex-nowrap">
          <div className="flex flex-1 flex-col items-center">
            <Title />

            {/* <div>
              <div className="mt-[50px] text-[14px] font-bold text-white sm:mt-[60px] md:text-[21px]">
                Илллюзионист Алексей Белинский не нуждается в представлении, так
                как:
              </div> */}
            <List className="mt-[20px] sm:mt-16" />
            {/* </div> */}
            <ImgPhone
              imgClassName="rounded-[10px]"
              imgSizeClassName="w-[220px]"
              width={240}
              height={360}
              className="my-20 sm:hidden md:my-28"
            />
          </div>
          <ImgPhone
            imgClassName="rounded-[20px]"
            imgSizeClassName="w-[380px] min-w-[380px]"
            width={460}
            height={690}
            className="hidden rounded-[20px] sm:block"
          />
        </div>
      </DivContent>
    </div>
  )
}

export default AboutBlock
