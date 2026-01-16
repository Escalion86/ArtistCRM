'use client'

import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import Button from '../components/Button'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import { useSetAtom } from 'jotai'
import yandexAimAtom from '@state/atoms/yandexAimAtom'

const Arrow = ({ right, className, onClick }) => {
  return (
    <div
      className={cn(
        'h-[46px] w-[46px] cursor-pointer rounded-full bg-gradient-to-r from-[#4272D1] to-[#83ACFF] bg-size-200 bg-pos-0 transition-all hover:via-[#83ACFF] hover:to-[#4272D1] hover:bg-pos-100 md:h-[76px] md:w-[76px]',
        className
      )}
      onClick={onClick}
    >
      <svg
        className="h-[46px] w-[46px] md:h-[76px] md:w-[76px]"
        xmlns="http://www.w3.org/2000/svg"
        // width={small ? 76 : 126}
        // height={small ? 76 : 126}
        viewBox="27 18 70 70"
        fill="none"
      >
        {right ? (
          <path
            d="M52.9707 51.9066C52.2807 51.9281 51.7388 52.505 51.7604 53.195C51.7819 53.885 52.3588 54.4269 53.0488 54.4053L52.9707 51.9066ZM73.9111 53.3871C74.3837 52.8839 74.359 52.0929 73.8558 51.6202L65.6563 43.9176C65.1531 43.4449 64.3621 43.4696 63.8894 43.9728C63.4167 44.476 63.4415 45.267 63.9446 45.7397L71.2331 52.5865L64.3863 59.8749C63.9137 60.3781 63.9384 61.1692 64.4416 61.6419C64.9447 62.1145 65.7358 62.0898 66.2085 61.5866L73.9111 53.3871ZM53.0488 54.4053L73.039 53.7806L72.961 51.2819L52.9707 51.9066L53.0488 54.4053Z"
            fill="white"
          />
        ) : (
          <path
            d="M73.0293 54.0932C73.7193 54.0716 74.2612 53.4948 74.2396 52.8048C74.2181 52.1147 73.6412 51.5729 72.9512 51.5944L73.0293 54.0932ZM52.0889 52.6127C51.6163 53.1158 51.641 53.9069 52.1442 54.3796L60.3437 62.0822C60.8469 62.5548 61.6379 62.5301 62.1106 62.0269C62.5833 61.5238 62.5585 60.7327 62.0554 60.26L54.7669 53.4133L61.6137 46.1248C62.0863 45.6216 62.0616 44.8306 61.5584 44.3579C61.0553 43.8852 60.2642 43.91 59.7915 44.4131L52.0889 52.6127ZM72.9512 51.5944L52.961 52.2191L53.039 54.7179L73.0293 54.0932L72.9512 51.5944Z"
            fill="white"
          />
        )}
      </svg>
    </div>
  )
}

// const photos = ['1', '2', '3', '4', '5']

const Gallery = ({
  type = 1,
  folder = 'gallery',
  imagesCount = 5,
  signs = [],
}) => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)

  const photos = Array.from({ length: imagesCount }, (_, i) => i + 1)

  var carousel,
    firstCardWidth,
    timer,
    infiniteScroll,
    visibleCardsOnCarousel,
    padding

  useEffect(() => {
    let isDragging = false,
      startX,
      startScrollLeft

    carousel = document.querySelector('.carousel' + type)
    firstCardWidth = carousel.querySelector('div').offsetWidth

    visibleCardsOnCarousel = Math.floor(carousel.offsetWidth / firstCardWidth)
    padding =
      (firstCardWidth * visibleCardsOnCarousel - carousel.offsetWidth) / 2
    // timer = setInterval(() => {
    //   // carousel.scrollLeft += 10
    //   // infiniteScroll()
    // }, 50)

    const dragStart = (e) => {
      clearInterval(timer)
      isDragging = true
      startX = e.pageX
      startScrollLeft = carousel.scrollLeft
    }

    const dragEnd = (e) => {
      isDragging = false
      infiniteScroll()
    }

    const draging = (e) => {
      if (!isDragging) return
      carousel.scrollLeft = startScrollLeft - (e.pageX - startX)
    }

    const oneSetImagesWidth = carousel.scrollWidth / photos.length

    infiniteScroll = () => {
      if (carousel.scrollLeft <= oneSetImagesWidth) {
        carousel.classList.add('no-transition')
        carousel.scrollLeft += firstCardWidth * photos.length
        carousel.classList.remove('no-transition')
      } else if (
        Math.ceil(carousel.scrollLeft) >=
        oneSetImagesWidth * 3 - carousel.offsetWidth
      ) {
        carousel.classList.add('no-transition')
        carousel.scrollLeft -= firstCardWidth * photos.length
        carousel.classList.remove('no-transition')
      }
    }

    var touchmove = false
    carousel.addEventListener(
      'scroll',
      function () {
        // console.log('timer :>> ', timer)
        if (touchmove) {
          if (timer !== null) {
            clearTimeout(timer)
          }
          timer = setTimeout(function () {
            // do something
            infiniteScroll()
            touchmove = false
          }, 150)
        }
      },
      false
    )
    carousel.addEventListener(
      'touchmove',
      function () {
        touchmove = true
      },
      false
    )
    carousel.addEventListener('touchstart', infiniteScroll)
    carousel.addEventListener('mousedown', dragStart)
    document.addEventListener('mouseup', dragEnd)
    carousel.addEventListener('mousemove', draging)
    carousel.classList.add('no-transition')
    carousel.scrollLeft = oneSetImagesWidth * 2.5 - carousel.offsetWidth / 2
    carousel.classList.remove('no-transition')
  }, [])

  const leftClick = (e) => {
    e?.stopPropagation()
    const deltaWidth = carousel.scrollLeft % firstCardWidth
    const deltaCarouselWidth = (carousel.offsetWidth % firstCardWidth) / 2
    const add =
      (Math.floor(carousel.offsetWidth / firstCardWidth) % 2 === 0
        ? -firstCardWidth * 0.5
        : 0) +
      deltaWidth +
      deltaCarouselWidth
    carousel.scrollLeft -= add <= 0 ? firstCardWidth + add : add
  }

  const rightClick = (e) => {
    e.stopPropagation()
    const deltaWidth = carousel.scrollLeft % firstCardWidth
    const deltaCarouselWidth = (carousel.offsetWidth % firstCardWidth) / 2
    const add =
      (Math.floor(carousel.offsetWidth / firstCardWidth) % 2 === 0
        ? firstCardWidth * 1.5
        : firstCardWidth * 2) -
      deltaWidth -
      deltaCarouselWidth
    carousel.scrollLeft += add
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={cn(
          'relative flex w-full flex-col items-center',
          type === 1 ? 'max-w-[1160px]' : ''
        )}
      >
        <Arrow
          className={cn(
            'absolute left-[20px] top-1/2 z-10 -translate-y-1/2',
            type === 1
              ? 'md:hidden xl:-left-[40px] xl:block 2xl:-left-[136px]'
              : 'xl:left-[calc(max(100%-1700px,54px))]'
          )}
          onClick={leftClick}
        />
        <Arrow
          right
          className={cn(
            'absolute right-[20px] top-1/2 z-10 -translate-y-1/2',
            type === 1
              ? 'md:hidden xl:-right-[40px] xl:block 2xl:-right-[136px]'
              : 'xl:right-[calc(max(100%-1700px,54px))]'
          )}
          onClick={rightClick}
        />
        <div
          className={cn(
            'no-scrollbar flex max-w-full cursor-pointer justify-start overflow-hidden overflow-x-auto scroll-smooth active:scroll-auto',
            'carousel' + type,
            type === 2 ? 'xl:transparentsides' : ''
          )}
        >
          {[...photos, ...photos, ...photos].map((name, index) => (
            <div
              key={'pic' + '-' + name + '-' + type + '-' + index}
              className={cn(
                'relative',
                type === 1 ? 'px-[10px] md:px-[20px]' : 'px-[10px]'
              )}
            >
              <img
                // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
                className={cn(
                  'inline aspect-[9/7] rounded-[20px] object-cover',
                  type === 1
                    ? 'w-[calc((100%-80px)/3)] min-w-[270px] md:min-w-[360px]'
                    : 'w-[calc((100%-80px)/3)] min-w-[270px] md:min-w-[462px]'
                )}
                alt={'pic' + name}
                src={`/img/${folder}/${name}.jpg`}
                style={{
                  scrollSnapAlign: 'start',
                  boxShadow: '4px 4px 25px 0px rgba(255, 255, 255, 0.15) inset',
                }}
                draggable={false}
              />
              {signs[index % imagesCount] && (
                <div
                  className={cn(
                    'absolute bottom-0 rounded-b-[20px] border-t border-white bg-black text-center text-white',
                    type === 1
                      ? '-ml-[2px] w-[calc((100%-86px)/3)] min-w-[272px] md:min-w-[362px]'
                      : 'w-[calc((100%-86px)/3)] min-w-[272px] md:min-w-[464px]'
                  )}
                >
                  {signs[index % imagesCount]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {type === 1 ? (
        <div className="mt-[30px] flex w-full max-w-[270px] items-center justify-center sm:max-w-[400px] md:mt-[60px] md:max-w-[520px] md:justify-between tablet:max-w-[680px] xl:hidden">
          <Button
            onClick={() => {
              setYandexAim('zakaz_show')
              setShowModalZakaz(true)
            }}
          />
          <div className="hidden gap-x-[20px] md:flex">
            <Arrow onClick={leftClick} />
            <Arrow right onClick={rightClick} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Gallery
