'use client'

import React from 'react'
import cn from 'classnames'
import Button from '../components/Button'
import DivContent from '../components/DivContent'
import DivText from '../components/DivText'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import yandexAimAtom from '@state/atoms/yandexAimAtom'
import windowDimensionsTailwindSelector from '@state/selectors/windowDimensionsTailwindSelector'

const InfoCard = ({ className, children }) => (
  <div
    className={cn(
      'flex h-[32px] w-full max-w-[420px] items-center justify-center gap-[10px] py-[7px] pl-[10px] pr-[9px] md:h-[70px] md:w-[310px] md:gap-[15px] md:py-[13px] md:pl-[20px] md:pr-[18px]',
      className
    )}
    style={{
      // width: 310,
      minWidth: 310,
      // height: 70,
      borderRadius: 7,
      border: '1px solid rgba(255, 255, 255, 0.05)',
      background:
        'linear-gradient(63deg, rgba(11, 11, 21, 0.30) 0%, rgba(26, 26, 50, 0.30) 100%)',
      boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
    }}
  >
    {children}
  </div>
)

const Title = ({ className }) => (
  <div
    className={cn(
      'mt-[20px] flex flex-col text-[34px] phoneH:text-[36px] sm:text-[50px] md:mt-[46px] md:text-[60px] tablet:text-[84px]',
      className
    )}
    style={{
      color: '#FFF',
      /* Title H1 -- First Block */
      fontFamily: 'Buyan',
      // fontSize: 84,
      fontStyle: 'normal',
      fontWeight: 700,
      lineHeight: '100%' /* 84px */,
    }}
  >
    <span>Иллюзионист</span>
    <div className="flex">
      <img
        className="-mb-[12px] -ml-[15px] -mr-[5px] -mt-[4px] w-[50px] object-contain sm:-mb-[15px] sm:-ml-[17px] sm:-mr-[6px] sm:-mt-[5px] sm:w-[60px] md:-mb-[15px] md:-ml-[22px] md:-mr-[8px] md:-mt-[5px] md:w-[80px] tablet:-mb-[17px] tablet:-ml-[30px] tablet:-mr-[6px] tablet:-mt-[6px] tablet:w-[107px]"
        alt="star"
        src="/img/star.png"
        draggable={false}
        // width={996}
        // height="75%"
      />
      <span
        style={{
          background: 'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%)',
          // backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          // color: '#0B2349',
        }}
      >
        Алексей Белинский
      </span>
    </div>
    <span>на Вашем мероприятии</span>
  </div>
)

const SvgParty = () => (
  <svg
    className="w-[18px] min-w-[18px] md:w-[36px] md:min-w-[36px]"
    xmlns="http://www.w3.org/2000/svg"
    width="37"
    height="36"
    viewBox="0 0 37 36"
    fill="none"
  >
    <path
      d="M9.2 16.95L3.5 33L19.55 27.3149"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 4.5H6.51333"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M33.5 12H33.5133"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23 3H23.0133"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M33.5 30H33.5133"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M33.5 3L30.14 4.125C29.1836 4.44358 28.3675 5.08446 27.8312 5.93809C27.295 6.79171 27.0719 7.80509 27.2 8.805V8.805C27.35 10.095 26.345 11.25 25.025 11.25H24.455C23.165 11.25 22.055 12.15 21.815 13.41L21.5 15"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M33.5 19.4999L32.27 19.0049C30.98 18.4949 29.54 19.3049 29.3 20.6699C29.135 21.7199 28.22 22.4999 27.155 22.4999H26"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 3L17.495 4.23C18.005 5.52 17.195 6.96 15.83 7.2C14.78 7.35 14 8.28 14 9.345V10.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.9998 19.5C19.8948 22.395 21.2448 25.755 19.9998 27C18.7548 28.245 15.3948 26.895 12.4998 24C9.60478 21.105 8.25478 17.745 9.49978 16.5C10.7448 15.255 14.1048 16.605 16.9998 19.5Z"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SvgDiamond = () => (
  <svg
    className="w-[18px] min-w-[18px] md:w-[36px] md:min-w-[36px]"
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
  >
    <path
      d="M7.99984 4H23.9998L29.3332 12L15.9998 29.3333L2.6665 12L7.99984 4Z"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 29.3333L21.3333 12L17.3333 4"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.9998 29.3333L10.6665 12L14.6665 4"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.6665 12H29.3332"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const GraySpan = ({ children }) => (
  <span style={{ color: '#A8A8CA' }}>{children}</span>
)

const InfoCardSpecial = () => (
  <InfoCard>
    <SvgDiamond />
    <div
      className="text-[11px] md:text-[16px]"
      style={{
        // width: 211,
        color: '#FFF',
        // fontSize: 16,
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '135%' /* 21.6px */,
      }}
    >
      Профессиональное шоу <GraySpan>специально под ваше мероприятие</GraySpan>
    </div>
  </InfoCard>
)

const InfoCardInclusive = () => (
  <InfoCard className="hidden tablet:flex">
    <SvgParty />
    <div
      className="text-[11px] md:text-[16px]"
      style={{
        // width: 211,
        color: '#FFF',
        // fontSize: 16,
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '135%' /* 21.6px */,
      }}
    >
      Эмоции гостей от увиденного <GraySpan>гарантированы</GraySpan>
    </div>
  </InfoCard>
)

const CupInfo = ({ className }) => (
  <div
    className={cn(
      'mt-0 flex w-[290px] items-center phoneH:w-[242px] phoneH:flex-row-reverse md:mt-[10px] md:w-[400px] md:flex-row tablet:w-[552px]',
      className
    )}
  >
    {/* <div
style={{
  width: 99.109,
  height: 148.664,
  // transform: 'rotate(-15deg)',
  flexShrink: 0,
  background:
    'url("/img/cup.png"), lightgray 50% / cover no-repeat',
}}
></div> */}
    <img
      className="mr-[10px] hidden w-[56px] -rotate-12 object-contain phoneH:block md:-ml-[14px] md:rotate-0 tablet:w-[70px]"
      alt="cup"
      src="/img/cup.png"
      draggable={false}
      // width={996}
      // height="75%"
    />
    <DivText
      // className="text-[12px] md:text-[15px] tablet:text-[21px]"
      style={{
        color: '#A8A8CA',
        // fontStyle: 'normal',
        // fontWeight: 400,
        // lineHeight: '145%' /* 30.45px */,
      }}
    >
      {/* <GraySpan>Вы получите </GraySpan> */}
      <span
        style={{
          // color: '#FFF',
          fontWeight: 600,
        }}
      >
        Представление телевизионного уровня
      </span>
      <GraySpan>
        ,<br />
        которое подарит массу эмоций
        <br />и запомнится на всю жизнь.
      </GraySpan>
    </DivText>
  </div>
)

const DiscountInfo = ({ className }) => (
  <div
    className={cn(
      'mb-[25px] mt-[26px] items-center gap-x-[10px] md:gap-x-[15px]',
      className
    )}
  >
    <div
      className="h-[7px] w-[7px] min-w-[7px] rounded-full"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
      }}
    />
    <div className="text-[11px] font-normal leading-[115%] text-[#A8A8CA] md:text-[15px] tablet:text-[16px]">
      Закажите сейчас и получите{' '}
      <span className="tablet:font-medium" style={{ color: '#FFF' }}>
        бесплатно дополнительный индивидуальный номер с вашей фотографией или
        логотипом компании
      </span>
    </div>
  </div>
)

const Content = () => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)
  const widthTailwind = useAtomValue(windowDimensionsTailwindSelector)

  return (
    <DivContent
      noMargin
      className="my-[50px] flex flex-1 flex-col md:my-[105px] xl:my-[124px]"
    >
      <div className="h-[76px] md:h-[107px]" />
      <div className="flex flex-1 flex-col justify-between gap-y-0">
        <div className="flex gap-x-[13px]">
          <InfoCardSpecial />
          <InfoCardInclusive />
        </div>
        <Title />
        <CupInfo />
        <div className="laptop:hidden mb-[25px] mt-[30px] flex items-center gap-x-[10px] md:gap-x-[15px]">
          <SvgParty />
          <div className="flex flex-col text-[11px] font-normal leading-[115%] text-white md:text-[15px]">
            Эмоции гостей от увиденного <GraySpan>гарантированы</GraySpan>
          </div>
        </div>
        <div className="laptop:h-[100px] relative mb-10 h-[70px] w-fit pr-[200px]">
          <div
            className="laptop:block laptop:rounded-r-[15px] absolute left-8 right-0 mt-[9px] hidden h-full rounded-r-[10px]"
            style={{
              // borderRadius: 7,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              background:
                'linear-gradient(343deg, rgba(96, 139, 246, 0.10) 0%, rgba(96, 139, 246, 0.00) 83.72%), linear-gradient(63deg, rgba(11, 11, 21, 0.10) 0%, rgba(26, 26, 50, 0.10) 100%)',
              backgroundBlendMode: 'color-dodge, normal',
              boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
              backdropFilter: 'blur(3px)',
            }}
          />
          <div className="relative flex items-center gap-x-[30px]">
            <Button
              className="-mt-[9px]"
              onClick={() => {
                setYandexAim('zakaz_show')
                setShowModalZakaz(true)
              }}
              small={widthTailwind === 'phoneV'}
            />
            <DiscountInfo className="laptop:flex hidden w-[320px]" />
          </div>
        </div>
        <DiscountInfo className="laptop:hidden flex w-[240px] tablet:w-[420px]" />
      </div>
    </DivContent>
  )
}

export default Content
