'use client'

import React from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Button from './components/Button'
import DivContent from './components/DivContent'
import DivText from './components/DivText'
import Gallery from './galleryComponents/Gallery'
import { useSetAtom } from 'jotai'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import BackLight from './components/BackLight'
import yandexAimAtom from '@state/atoms/yandexAimAtom'

const SpanStar = ({ children }) => (
  <span className="font-bold">
    <img
      className="-ml-4 inline w-4 object-contain sm:-ml-[30px] sm:w-[30px] md:-ml-[40px] md:w-[40px] tablet:-ml-[50px] tablet:w-[50px]"
      alt="star"
      src="/img/star.png"
      draggable={false}
    />
    {children}
  </span>
)

const Title = ({ className }) => (
  <div
    className={cn(
      'w-[200px] font-buyan text-[29px] font-bold leading-[100%] text-white phoneH:w-[220px] phoneH:text-[32px] sm:w-[240px] sm:text-[36px] md:w-[500px] md:text-[42px] tablet:text-[64px]',
      className
    )}
  >
    Почему иллюзионист и<br />
    <SpanGradientTitle>где это уместно?</SpanGradientTitle>
  </div>
)

const GalleryBlock = () => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)

  return (
    <div className="relative mt-[100px] flex w-full flex-col items-center md:mt-[110px] xl:mt-[150px]">
      <DivContent noMargin className="flex flex-col items-center gap-y-[20px]">
        <div className="flex max-w-[600px] flex-col items-start justify-between gap-x-[100px] tablet:max-w-[720px] xl:max-w-full xl:flex-row xl:items-center">
          <div className="flex flex-col gap-y-[50px]">
            <Title />
            <Button
              className="hidden xl:block"
              onClick={() => {
                setYandexAim('zakaz_show')
                setShowModalZakaz(true)
              }}
            />
          </div>
          <DivText className="laptop:max-w-[720px] mt-[30px] w-full max-w-[270px] sm:max-w-[480px] md:max-w-[500px] tablet:max-w-[600px] xl:mt-0">
            <SpanStar>На любом событии это уместно!</SpanStar>
            <br />
            Корпоратив, Свадьба, Юбилей или День Рождения, открытие заведения и
            любое другое мероприятие
            <br />
            <br />
            <SpanStar>Место, обстановка и время не имеют значения!</SpanStar>
            <br />
            Алексей имеет опыт выступлений в самых разных обстановках, в том
            числе: на борту самолёта в воздухе, на корабле, в поле (без
            элетричества) и даже в пещере!
            <br />
            <br />
            <SpanStar>Чтобы мероприятие запомнилось - нужны эмоции!</SpanStar>
            <br />
            Только искренние сильные эмоции запоминаются надолго, именно поэтому
            выступление профессионального шоумена-иллюзиониста гарантирует успех
            за счёт своей уникальности и индивидуальности
            <br />
            <br />
            <SpanStar>Индивидуальный подход!</SpanStar>
            <br />
            Сценарий шоу программы подбирается индивидуально, с учетом всех
            нюансов аудитории, сцены и тематики мероприятия, для достижения
            максимального эффекта
          </DivText>
        </div>
      </DivContent>
      <div className="relative z-10 mt-[35px] w-full md:mt-[70px] xl:mt-[120px] xl:px-[52px]">
        <Gallery
          type={1}
          folder="gallery"
          imagesCount={7}
          signs={[
            'Левитация именинницы',
            'Корпоративы и свадьбы',
            'Искренние эмоции',
            'Где угодно, даже в самолете',
            // 'Постановка номеров по желанию',
            'Презентации',
            'Уникальные номера',
            'Шоу "Всё, кроме обычного"',
          ]}
        />
      </div>
      <div
        className="absolute right-0 top-[90px] z-10 hidden aspect-[235/303] h-[265px] w-[207px] md:block xl:hidden 2xl:h-[303px] 2xl:w-[235px]"
        style={{
          background: 'url("/img/hand2.png")',
          mixBlendMode: 'hard-light',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <BackLight
        className="-top-[32px] left-0 -translate-x-[42%] scale-[79.4%] md:-top-[120px] md:-translate-x-1/3 md:scale-[100%] xl:-top-[20px] xl:-translate-x-1/2"
        opacity={40}
      />
      {/* <div
        className="absolute left-[calc(15%-400px)] top-[150px] h-[509px] w-[320px] rounded-full"
        style={{
          transform: 'rotate(135deg)',
          background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
          boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
          filter: 'blur(177.5px)',
        }}
      />
      <div
        className="absolute left-[calc(15%-490px)] top-[100px] h-[410px] w-[258px] rounded-full"
        style={{
          transform: 'rotate(-165deg)',
          background: 'linear-gradient(64deg, #773FCA 0%, #8E42FF 71.51%)',
          boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
          filter: 'blur(177.5px)',
        }}
      /> */}
      <div
        className="absolute -right-[90%] top-[300px] h-[413px] w-[260px] rounded-full opacity-40 md:right-[calc(15%-350px)] xl:top-[680px]"
        style={{
          transform: 'rotate(30deg)',
          background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
          boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
          filter: 'blur(177.5px)',
        }}
      />
      <div
        className="h-332px] absolute -right-[90%] top-[700px] h-[332px] w-[209px] rounded-full opacity-40 md:right-[calc(15%-340px)] xl:top-[1080px]"
        style={{
          transform: 'rotate(90deg)',
          background: 'linear-gradient(64deg, #773FCA 0%, #8E42FF 71.51%)',
          boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
          filter: 'blur(177.5px)',
        }}
      />
    </div>
  )
}

export default GalleryBlock
