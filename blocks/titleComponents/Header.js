'use client'

import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import Image from 'next/image'
import { useSetAtom } from 'jotai'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import yandexAimAtom from '@state/atoms/yandexAimAtom'
import Link from 'next/link'
import { reachGoal } from 'app/components/metrika'

const MenuItem = ({ name, active, href }) => (
  <li
    className={cn(
      'cursor-pointer text-center text-[16px] leading-[125%] font-medium duration-300 hover:text-[#FFCA45]',
      active ? 'text-white' : 'text-[#A8A8CA]'
    )}
  >
    <Link href={href}>{name}</Link>
  </li>
)

const ContactButton = ({ children, href, onClick, big, ariaLabel }) => {
  const Component = ({ children, ...props }) =>
    href ? (
      <Link href={href} {...props}>
        {children}
      </Link>
    ) : (
      <div {...props}>{children}</div>
    )
  return (
    <Component
      href={href}
      target="_blank"
      className={cn(
        'contact-button flex cursor-pointer items-center justify-center rounded-[7px] p-[8px] transition-all duration-300 sm:h-[50px] sm:w-[50px] sm:p-[13px]',
        big ? 'h-[40px] w-[40px]' : 'h-[36px] w-[36px]'
      )}
      style={{
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.06) inset',
      }}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </Component>
  )
}

const TelegramIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <g clipPath="url(#clip0_72_1821)">
      <path
        d="M23.53 1.9663C23.3401 1.79249 23.1073 1.67238 22.8556 1.6183C22.6039 1.56421 22.3423 1.57811 22.0978 1.65857L0.995214 8.61486C0.420104 8.80443 0.0301044 9.3178 0.00165128 9.92263C-0.026755 10.5275 0.313323 11.0752 0.868042 11.318L6.08687 13.6014L7.66145 20.9043C7.72684 21.2076 7.88082 21.4779 8.20703 21.561C8.53698 21.645 8.77009 21.4647 9.01628 21.2804L12.8891 18.3805L17.4167 22.0854C17.6804 22.3013 18.0027 22.4139 18.3314 22.4139C18.4906 22.4138 18.6487 22.3875 18.7995 22.3363C19.276 22.1747 19.6292 21.7858 19.7444 21.296L23.9616 3.36618C24.0204 3.11554 24.0114 2.85377 23.9356 2.60775C23.8597 2.36173 23.7197 2.14033 23.53 1.9663ZM9.35364 14.9098C9.35106 14.9159 9.34853 14.9228 9.34614 14.931L8.47313 17.9811L7.49889 13.4626L14.1981 9.74047L9.51432 14.6379C9.44087 14.7152 9.38593 14.8082 9.35364 14.9098ZM9.63071 19.0594L10.0272 17.674L10.4065 16.3489L11.7654 17.461L9.63071 19.0594ZM22.5894 3.04339L18.3723 20.9732C18.3702 20.9821 18.3674 20.9944 18.3468 21.0013C18.3264 21.0083 18.3164 21.0004 18.3094 20.9946L13.3551 16.9404L13.3547 16.9401L11.0593 15.0617L18.4338 7.35088C18.5504 7.22901 18.6194 7.06939 18.6283 6.90099C18.6372 6.7326 18.5854 6.56659 18.4824 6.43311C18.3793 6.29962 18.2318 6.2075 18.0666 6.17348C17.9015 6.13946 17.7296 6.1658 17.5822 6.24772L6.66259 12.3147L1.43307 10.0266C1.41714 10.0197 1.40837 10.0158 1.40964 9.98882C1.4109 9.96196 1.42 9.95891 1.4365 9.95347L22.5391 2.99722C22.5493 2.99389 22.5608 2.99005 22.5778 3.00552C22.5947 3.02108 22.5919 3.03289 22.5894 3.04339Z"
        fill="white"
      />
    </g>
    <defs>
      <clipPath id="clip0_72_1821">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const WhatsappIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <g clipPath="url(#clip0_72_1825)">
      <path
        d="M17.5071 14.3069L17.4981 14.3819C15.2991 13.2859 15.0691 13.1399 14.7851 13.5659C14.5881 13.8609 14.0141 14.5299 13.8411 14.7279C13.6661 14.9229 13.4921 14.9379 13.1951 14.8029C12.8951 14.6529 11.9321 14.3379 10.7921 13.3179C9.90414 12.5229 9.30814 11.5479 9.13214 11.2479C8.83914 10.7419 9.45214 10.6699 10.0101 9.61393C10.1101 9.40393 10.0591 9.23893 9.98514 9.08993C9.91014 8.93993 9.31314 7.46993 9.06314 6.88393C8.82314 6.29993 8.57614 6.37393 8.39114 6.37393C7.81514 6.32393 7.39414 6.33193 7.02314 6.71793C5.40914 8.49193 5.81614 10.3219 7.19714 12.2679C9.91114 15.8199 11.3571 16.4739 14.0011 17.3819C14.7151 17.6089 15.3661 17.5769 15.8811 17.5029C16.4551 17.4119 17.6481 16.7819 17.8971 16.0769C18.1521 15.3719 18.1521 14.7869 18.0771 14.6519C18.0031 14.5169 17.8071 14.4419 17.5071 14.3069Z"
        fill="white"
      />
      <path
        d="M20.52 3.44894C12.831 -3.98406 0.106 1.40694 0.101 11.8929C0.101 13.9889 0.65 16.0329 1.696 17.8379L0 23.9999L6.335 22.3479C14.24 26.6179 23.996 20.9479 24 11.8989C24 8.72295 22.76 5.73394 20.505 3.48794L20.52 3.44894ZM22.002 11.8659C21.996 19.4989 13.617 24.2659 6.99 20.3699L6.63 20.1559L2.88 21.1309L3.885 17.4859L3.646 17.1109C-0.478 10.5459 4.26 1.96594 12.072 1.96594C13.3766 1.96266 14.6688 2.21817 15.874 2.71767C17.0791 3.21717 18.1733 3.95075 19.093 4.87594C20.0178 5.78952 20.7513 6.87815 21.2507 8.07829C21.7502 9.27843 22.0056 10.566 22.002 11.8659Z"
        fill="white"
      />
    </g>
    <defs>
      <clipPath id="clip0_72_1825">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const BurgerIcon = () => (
  <svg
    width="34"
    height="18"
    viewBox="0 0 34 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2 2H32" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
    <path d="M6 9H28" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
    <path d="M2 16H32" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
)

const CloseIcon = () => (
  <svg
    width="23"
    height="23"
    viewBox="0 0 23 23"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1.7063 1.69873L21.5069 21.5001"
      stroke="white"
      strokeWidth="2.14689"
      strokeLinecap="round"
    />
    <path
      d="M1.7063 21.3013L21.5069 1.49986"
      stroke="white"
      strokeWidth="2.14689"
      strokeLinecap="round"
    />
  </svg>
)

const WhatsappButton = () => {
  return (
    <ContactButton
      href="https://api.whatsapp.com/send?phone=79138370020"
      onClick={() => reachGoal('klick_WA')}
      ariaLabel="Whatsapp"
    >
      <WhatsappIcon />
    </ContactButton>
  )
}

const TelegramButton = () => {
  return (
    <ContactButton
      href="https://t.me/escalion"
      onClick={() => reachGoal('klick_TG')}
      ariaLabel="Telegram"
    >
      <TelegramIcon />
    </ContactButton>
  )
}

const BurgerButton = ({ opened = false, onClick }) => (
  <ContactButton big onClick={onClick} ariaLabel="Menu">
    {opened ? <CloseIcon /> : <BurgerIcon />}
  </ContactButton>
)

const Header = () => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)
  const [showMenu, setShowMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isPastTitle, setIsPastTitle] = useState(false)

  useEffect(() => {
    const onScrollFunc = () => {
      const scrollFromTop = window.scrollY
      setIsScrolled(scrollFromTop > 60)
      const titleBlockComponent = document.querySelector('.titleblock')
      if (titleBlockComponent) {
        setIsPastTitle(scrollFromTop > titleBlockComponent.offsetHeight)
      }
    }
    window.addEventListener('scroll', onScrollFunc, { passive: true })
    onScrollFunc()
    return () => window.removeEventListener('scroll', onScrollFunc)
  }, [])

  const BurgerMenuItem = ({ children, href }) => {
    return (
      <li
        className="cursor-pointer bg-gradient-to-r from-[#fff] to-[#fff] whitespace-nowrap duration-300 hover:from-[#C17C0E] hover:via-[#FFCA45] hover:via-[63.68%] hover:to-[#FFCA45]"
        style={{
          // background: 'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        <a href={href} onClick={() => setShowMenu(false)}>
          {children}
        </a>
      </li>
    )
  }

  return (
    <div
      className={cn(
        'headerwrapper sticky z-50 flex h-0 w-full justify-center duration-300',
        isPastTitle ? 'xl:-top-[13px]' : 'xl:-top-[100px]',
        '-top-[13px]'
      )}
    >
      <nav
        className={cn(
          'fixed top-0 right-0 flex h-screen items-center justify-center overflow-hidden duration-500 xl:hidden',
          showMenu ? 'w-full' : 'w-[0px]'
        )}
        style={{
          background: 'rgba(19, 19, 35, 0.95)',
          backdropFilter: 'blur(7.5px)',
        }}
      >
        <ul
          className="flex min-w-fit flex-col gap-y-[10px] text-center text-[28px] leading-[100%] font-bold text-white md:text-[38px]"
          style={{
            fontFamily: 'Buyan',
          }}
        >
          <BurgerMenuItem href="#about">Об иллюзионисте</BurgerMenuItem>
          <BurgerMenuItem href="#why">Где уместно?</BurgerMenuItem>
          <BurgerMenuItem href="#video">Посмотреть видео</BurgerMenuItem>
          <BurgerMenuItem href="#quiz">Пройти квиз</BurgerMenuItem>
          <BurgerMenuItem href="#fotos">Фотографии</BurgerMenuItem>
          <BurgerMenuItem href="#reviews">Отзывы</BurgerMenuItem>
          <BurgerMenuItem href="#zakaz">Оставить заявку</BurgerMenuItem>
        </ul>
      </nav>
      <div
        className={cn(
          'header absolute top-0 right-0 left-1/2 mt-[13px] flex h-[80px] w-full -translate-x-1/2 justify-center px-[17px] py-[10px] duration-500 md:h-[94px] md:px-[52px] md:py-[17px]',
          isScrolled ? 'bg-[#131323]/90 hover:bg-[#131323]' : 'bg-[#131323]/0',
          isPastTitle ? 'xl:bg-[#131323]/90' : 'xl:bg-[#131323]/0'
        )}
      >
        <div className="flex w-full max-w-[1264px] justify-between gap-x-[10px]">
          <div className="flex flex-1 items-center gap-x-[19px]">
            <Image
              className="min-w-[46px] sm:hidden"
              alt="logo"
              src="/img/logo.png"
              width={46}
              height={46}
            />
            <Image
              className="hidden min-w-[60px] sm:block"
              alt="logo"
              src="/img/logo.png"
              width={60}
              height={60}
            />
            <div className="tablet:text-[16px] hidden flex-col text-[15px] leading-[125%] font-normal whitespace-nowrap text-white md:flex">
              <span>Алексей Белинский</span>
              <span
                style={{
                  color: '#A8A8CA',
                }}
              >
                Иллюзионист
              </span>
            </div>
          </div>
          <ol
            className="hidden items-center justify-center gap-[40px] rounded-full px-[40px] py-[18px] xl:flex"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <MenuItem name="Об иллюзионисте" href="#about" />
            <MenuItem name="Где уместно?" href="#why" />
            <MenuItem name="Отзывы" href="#reviews" />
          </ol>
          <div className="flex flex-1 items-center justify-end gap-x-[13px] md:gap-x-[20px]">
            <div className="flex items-center gap-x-[3px] md:gap-x-[10px]">
              <WhatsappButton />
              <TelegramButton />
            </div>
            <div className="flex flex-col justify-center text-right text-[15px] whitespace-nowrap sm:text-[22px]">
              <Link
                href="tel:+79138370020"
                className="cursor-pointer leading-[125%] font-medium text-white duration-300 hover:text-[#FFCA45]"
                onClick={() => reachGoal('klick_nomber')}
                target="_blank"
                prefetch={false}
              >
                8(913)837-00-20
              </Link>
              <button
                className="w-fit cursor-pointer border-b border-dashed border-[#A8A8CA] border-[#a8a8cae6] text-[12px] leading-[125%] font-normal text-[#A8A8CA] duration-300 hover:border-[#FFCA45] hover:text-[#FFCA45] sm:text-[15px] md:text-[16px]"
                style={{
                  WebkitBackgroundClip: 'padding-box',
                  backgroundClip: 'padding-box',
                }}
                onClick={() => {
                  setYandexAim('zakaz_zvonok')
                  setShowModalZakaz(true)
                }}
              >
                Заказать звонок
              </button>
            </div>
            <div className="md:ml-[50px] xl:hidden">
              <BurgerButton
                opened={showMenu}
                onClick={() => setShowMenu((state) => !state)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
