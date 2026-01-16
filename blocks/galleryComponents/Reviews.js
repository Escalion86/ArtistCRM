'use client'

import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import Button from '../components/Button'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import { useSetAtom } from 'jotai'

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

const reviews = [
  {
    imgUrl: `/img/reviews/1.jpg`,
    userName: 'Азамат Мусагалиев',
    text: 'Превосходное выступление на шоу "Все, кроме обычного". Вы поняли как он это сделал?',
  },
  {
    imgUrl: `/img/reviews/2.jpg`,
    userName: 'Ольга Серябкина',
    text: 'Обаятельный фокусник и очень хороший человек. Спасибо, Алексей, за то что дали возможность прикоснуться к волшебству!',
  },
  {
    imgUrl: `/img/reviews/3.jpg`,
    userName: 'Михаил Кукота',
    text: 'Несмотря на все форсмажоры независящие от Алексея, что были во время шоу - Алексей превзошел сам себя и вытянул шоу на достойный уровень! Красавчик!',
  },
  // {
  //   imgUrl: `/img/reviews/1.jpg`,
  //   userName: 'Наталья Еремина',
  //   text: 'Вы настоящий маг! Мы с мужем хотели провести необычную свадьбу и сделать ее по настоящему незабываемой. Не хотелось этой банальщины, которую обычно делают на свадьбах. Нам посоветовали пригласить вас, и мы не пожалели. Такие шоу я видела только в интернете и по телевизору. Все остались в восторге. Спасибо огромное!',
  // },
  // {
  //   imgUrl: `/img/reviews/2.jpg`,
  //   userName: 'Мансур Бурлаков',
  //   text: 'Владелец event-агентства. Мы раньше никогда не работали с иллюзионистами и даже подумать не могли, что они умеют делать настолько проработанные шоу. Эмоции получили не только гости, но и мы, как организаторы мероприятия. Браво, Алексей!',
  // },
  // {
  //   imgUrl: `/img/reviews/3.jpg`,
  //   userName: 'Ангелина Новикова',
  //   text: 'Корпоратив получился очень классным. Никогда не думала, что такие представления можно заказать под ключ. Я раньше думала, что иллюзионисты показывают простые фокусы с шариками и картами, но вы нас прямо удивили. Все гости в восторге!',
  // },
  // {
  //   imgUrl: `/img/reviews/4.jpg`,
  //   userName: 'Мирослава Арсентьева',
  //   text: 'Позвала иллюзиониста на Юбилей в качестве подарка и непрогадала! Именинник долго еще вспоминал про Алексея. Эмоций хватила на весь день и еще на неделю после )))',
  // },
]

const Star = () => (
  <svg
    className="h-[11px] w-[11px] md:h-[17px] md:w-[17px]"
    xmlns="http://www.w3.org/2000/svg"
    // width="10"
    // height="9"
    viewBox="0 0 10 9"
    fill="none"
  >
    <path
      d="M4.62153 0.677884C4.73628 0.324715 5.23592 0.324714 5.35067 0.677883L6.11927 3.04339C6.17059 3.20133 6.31777 3.30827 6.48384 3.30827H8.97108C9.34243 3.30827 9.49683 3.78346 9.1964 4.00173L7.18418 5.46369C7.04983 5.5613 6.99361 5.73433 7.04493 5.89227L7.81353 8.25778C7.92828 8.61095 7.52406 8.90463 7.22364 8.68636L5.21142 7.22439C5.07706 7.12678 4.89513 7.12678 4.76078 7.22439L2.74856 8.68636C2.44814 8.90463 2.04392 8.61095 2.15867 8.25778L2.92727 5.89227C2.97859 5.73433 2.92237 5.5613 2.78802 5.46369L0.775794 4.00173C0.475371 3.78346 0.629767 3.30827 1.00111 3.30827H3.48835C3.65442 3.30827 3.80161 3.20133 3.85293 3.04339L4.62153 0.677884Z"
      fill="url(#paint0_linear_372_1103)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_372_1103"
        x1="9.92297"
        y1="9.02053"
        x2="-0.444455"
        y2="9.02551"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FBCB64" />
        <stop offset="1" stopColor="#AD7404" />
      </linearGradient>
    </defs>
  </svg>
)

const Reviews = ({ className }) => {
  // const setShowModalZakaz = useSetAtom(showModalZakazAtom)

  var carousel,
    firstCardWidth,
    timer,
    padding,
    visibleCardsOnCarousel,
    infiniteScroll

  useEffect(() => {
    let isDragging = false,
      startX,
      startScrollLeft

    carousel = document.querySelector('.carousel-reviews')
    firstCardWidth = carousel.querySelector('div').offsetWidth

    visibleCardsOnCarousel = Math.ceil(carousel.offsetWidth / firstCardWidth)
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
      // e.preventDefault()
      // e.stopPropagation()
      const deltaWidth = carousel.scrollLeft % firstCardWidth
      if (deltaWidth > padding)
        if (deltaWidth < firstCardWidth / 2) leftClick()
        else rightClick()
      else {
        infiniteScroll()
        const add = -deltaWidth + padding
        carousel.scrollLeft += add
      }
    }

    // const mouseUp = () => {
    //   const deltaWidth = carousel.scrollLeft % firstCardWidth
    //   console.log('deltaWidth :>> ', deltaWidth)
    //   if (deltaWidth > padding)
    //     if (deltaWidth < firstCardWidth / 2) leftClick()
    //     else rightClick()
    //   // infiniteScroll()
    // }

    const draging = (e) => {
      if (!isDragging) return
      carousel.scrollLeft = startScrollLeft - (e.pageX - startX)
    }

    const oneSetImagesWidth = carousel.scrollWidth / reviews.length

    infiniteScroll = () => {
      if (carousel.scrollLeft <= oneSetImagesWidth) {
        carousel.classList.add('no-transition')
        carousel.scrollLeft += firstCardWidth * reviews.length
        carousel.classList.remove('no-transition')
      } else if (
        Math.ceil(carousel.scrollLeft) >=
        oneSetImagesWidth * 3 - carousel.offsetWidth
      ) {
        carousel.classList.add('no-transition')
        carousel.scrollLeft -= firstCardWidth * reviews.length
        carousel.classList.remove('no-transition')
      }
    }

    // carousel.addEventListener('touchstart', dragStart)
    // carousel.addEventListener('touchmove', draging)
    // carousel.addEventListener('scroll', scroll)
    var timer = null
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
            const deltaWidth = carousel.scrollLeft % firstCardWidth
            if (deltaWidth > padding)
              if (deltaWidth < firstCardWidth / 2) leftClick()
              else rightClick()
            else {
              infiniteScroll()
              const add = -deltaWidth + padding
              carousel.scrollLeft += add
            }
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

    // carousel.addEventListener('touchend', infiniteScroll)
    carousel.addEventListener('mousedown', dragStart)
    document.addEventListener('mouseup', dragEnd)
    carousel.addEventListener('mousemove', draging)
    carousel.classList.add('no-transition')
    carousel.scrollLeft = firstCardWidth * reviews.length + padding
    carousel.classList.remove('no-transition')
    document.addEventListener('mousewheel', function (e) {
      e.preventDefault()
    })
  }, [])

  const leftClick = (e) => {
    e?.stopPropagation()
    infiniteScroll()
    const deltaWidth = carousel.scrollLeft % firstCardWidth
    const add =
      (deltaWidth > padding ? 0 : firstCardWidth) + deltaWidth - padding
    carousel.scrollLeft -= add
  }

  const rightClick = (e) => {
    e?.stopPropagation()
    infiniteScroll()
    const deltaWidth = carousel.scrollLeft % firstCardWidth
    const add = firstCardWidth - deltaWidth + padding
    carousel.scrollLeft += add
  }

  return (
    <div className={cn('flex w-full flex-col items-center', className)}>
      <div
        className={cn(
          'relative flex w-full flex-col items-center',
          'max-w-[230px] sm:max-w-[480px] md:max-w-[620px] tablet:max-w-[760px] xl:max-w-[1160px]'
        )}
      >
        <Arrow
          className={cn(
            'absolute -left-[34px] top-1/2 z-10 -translate-y-1/2 sm:-left-[60px] tablet:-left-[100px]',
            'xl:-left-[50px] 2xl:-left-[110px]'
          )}
          onClick={leftClick}
        />
        <Arrow
          right
          className={cn(
            'absolute -right-[34px] top-1/2 z-10 -translate-y-1/2 sm:-right-[60px] tablet:-right-[100px]',
            'xl:-right-[50px] 2xl:-right-[110px]'
          )}
          onClick={rightClick}
        />
        <div
          className={cn(
            'no-scrollbar flex max-w-full cursor-pointer justify-start overflow-x-auto scroll-smooth active:scroll-auto',
            'carousel-reviews'
          )}
          style={
            {
              // touchAction: 'none',
              // scrollSnapStop: 'always',
              // scrollSnapType: 'x mandatory',
              // WebkitOverflowScrolling: 'touch',
              // MozOverflowScrolling: 'touch',
            }
          }
        >
          {[...reviews, ...reviews, ...reviews].map(
            ({ imgUrl, userName, text }, index) => (
              <div
                key={'review' + userName + imgUrl + index}
                className="inline select-none px-[10px] tablet:px-[20px]"
              >
                <div
                  className={cn(
                    'flex h-[293px] min-w-[230px] flex-col gap-y-[13px] rounded-[20px] bg-white px-[19px] pb-[16px] pt-[13px] md:h-[400px] md:min-w-[300px] tablet:h-[460px] tablet:min-w-[360px] tablet:gap-y-[20px] tablet:px-[30px] tablet:pb-[25px] tablet:pt-[20px]'
                  )}
                >
                  <div className="flex items-center gap-x-[15px]">
                    <img
                      className="h-[30px] w-[30px] rounded-full object-contain md:h-[50px] md:w-[50px] tablet:h-[60px] tablet:w-[60px]"
                      alt={'photo'}
                      src={imgUrl}
                      // style={{
                      //   scrollSnapAlign: 'start',
                      //   borderRadius: 20,
                      //   boxShadow: '4px 4px 25px 0px rgba(255, 255, 255, 0.15) inset',
                      // }}
                      draggable={false}
                    />
                    <div className="flex flex-col gap-y-[2px] md:gap-y-[3px]">
                      <div className="whitespace-nowrap text-[16px] font-normal text-[#0E0E1C] md:text-[20px] tablet:text-[24px]">
                        {userName}
                      </div>
                      <div className="flex">
                        <Star />
                        <Star />
                        <Star />
                        <Star />
                        <Star />
                      </div>
                    </div>
                  </div>
                  <div className="w-full border-t border-[#0E0E1C] opacity-10" />
                  <div className="text-[16px] font-light leading-[140%] text-[#0E0E1C] md:text-[22px] tablet:text-[24px]">
                    {text}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default Reviews
