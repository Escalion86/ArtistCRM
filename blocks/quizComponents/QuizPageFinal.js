'use client'

import React, { useState } from 'react'
import cn from 'classnames'
import SpanGradientTitle from '../components/SpanGradientTitle'
import Button from '../components/Button'
import MaskedInput from 'react-text-mask'

const SocialContact = ({
  iconStyle,
  svg,
  children,
  isSelected,
  iconClassName,
  onClick,
}) => (
  <div
    className={cn(
      'group mr-[10px] flex cursor-pointer items-center transition-all duration-500',
      isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-100'
    )}
    onClick={onClick}
  >
    <div
      className={cn(
        'z-10 mr-[10px] flex h-[32px] w-[32px] items-center justify-center rounded-[4.5px] md:h-[50px] md:w-[50px] md:rounded-[7px]',
        iconClassName
      )}
      style={{
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.06) inset',
        ...iconStyle,
      }}
    >
      {svg}
    </div>
    <div
      className={cn(
        '-ml-[10px] -mr-[10px] flex h-[32px] items-center overflow-hidden whitespace-nowrap rounded-[4.5px] bg-white text-[11px] font-normal leading-[115%] text-[#0E0E1C] duration-500 md:h-[50px] md:rounded-r-[7px] md:text-[14px]',
        isSelected ? 'max-w-[140px]' : 'max-w-0 group-hover:max-w-[140px]'
      )}
    >
      <div className="pl-[10px] pr-[5px]">{children}</div>
    </div>
  </div>
)

const QuizPageFinal = ({
  show,
  onSubmit,
  isQuizSended,
  handleEnterKeyDown,
}) => {
  const [phone, setPhone] = useState('')
  const [selectedContact, setSelectedContact] = useState()

  const isButtonDisabled =
    isQuizSended === 'inProcess' || !phone || phone?.toString().length < 11

  return (
    <div
      className={cn(
        'flex w-full max-w-full flex-col transition-all duration-500',
        show
          ? 'relative z-10 opacity-100'
          : 'absolute left-0 right-0 top-0 opacity-0'
      )}
    >
      <div className="flex items-center gap-x-[10px] md:gap-x-[20px]">
        <div
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full md:h-[50px] md:w-[50px]"
          style={{
            background: 'linear-gradient(63deg, #692DC1 0%, #AC80EC 100%)',
            boxShadow:
              '3.84px 3.84px 16.64px 0px rgba(255, 255, 255, 0.35) inset',
          }}
        >
          <svg
            className="h-[17px] w-[18px] md:h-[26px] md:w-[28px]"
            viewBox="0 0 28 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.8712 1.13045C13.2524 0.0732028 14.7476 0.0732009 15.1288 1.13045L17.5795 7.92653C17.7464 8.38915 18.1786 8.70315 18.6701 8.71885L25.8908 8.94949C27.0141 8.98537 27.4762 10.4074 26.5885 11.0967L20.8823 15.5275C20.4939 15.8291 20.3288 16.3372 20.4658 16.8095L22.4778 23.7482C22.7908 24.8276 21.5811 25.7064 20.6513 25.0752L14.674 21.0175C14.2671 20.7413 13.7329 20.7413 13.326 21.0175L7.34873 25.0752C6.41886 25.7064 5.20921 24.8276 5.52221 23.7482L7.5342 16.8095C7.67116 16.3372 7.50607 15.8291 7.11765 15.5275L1.4115 11.0967C0.523807 10.4074 0.985848 8.98537 2.10916 8.94949L9.32993 8.71885C9.82145 8.70315 10.2536 8.38915 10.4205 7.92653L12.8712 1.13045Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="text-[18px] font-bold leading-[120%] text-[#0E0E1C] md:text-[42px]">
          Мы уже <SpanGradientTitle>продумываем</SpanGradientTitle>
          <br />
          ваше мероприятие
        </div>
      </div>
      <div className="mt-[20px] text-[12px] font-normal leading-[135%] text-[#0E0E1C] md:mt-[35px] md:text-[21px]">
        Напишите номер телефона и выберите
        <br />
        удобный мессенджер. Мы обсудим шоу там.
      </div>
      <div className="mt-[20px] text-[12px] font-medium leading-[125%] text-[#0E0E1C] md:mt-[35px] md:text-[21px]">
        Мы также закрепили за вами подарок:
      </div>
      <div
        className="mt-[10px] flex w-fit items-center gap-x-[13px] rounded-[10px] px-[15px] py-[10px] md:px-[40px] md:py-[17px]"
        style={{
          background:
            'linear-gradient(341deg, rgba(96, 139, 246, 0.16) 0%, rgba(96, 139, 246, 0.00) 100%), #EDEDED',
          boxShadow:
            '3px 3px 25px 0px rgba(255, 255, 255, 0.03) inset, 0px 25px 36px 0px rgba(255, 255, 255, 0.20) inset',
        }}
      >
        <div
          className="h-[14px] w-[14px] rounded-full"
          style={{
            border: '1px solid rgba(14, 14, 28, 0.05)',
            background:
              'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%), rgba(14, 14, 28, 0.04)',
            boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
          }}
        />
        <div className="text-[12px] font-semibold leading-[125%] text-[#0E0E1C] md:text-[18px]">
          Индивидуальный номер
          <br />с вашей фотографией
          <br />
          или логотипом компании
        </div>
      </div>
      {!isQuizSended ? (
        <>
          <div className="mt-[15px] flex w-full max-w-full items-center gap-x-[10px] overflow-x-hidden md:mt-[50px]">
            <SocialContact
              onClick={() => setSelectedContact('whatsapp')}
              isSelected={selectedContact === 'whatsapp'}
              svg={
                <svg
                  className="h-[16px] w-[16px] md:h-[24px] md:w-[24px]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <g clipPath="url(#clip0_301_1537)">
                    <path
                      d="M17.5064 14.3069L17.4974 14.3819C15.2984 13.2859 15.0684 13.1399 14.7844 13.5659C14.5874 13.8609 14.0134 14.5299 13.8404 14.7279C13.6654 14.9229 13.4914 14.9379 13.1944 14.8029C12.8944 14.6529 11.9314 14.3379 10.7914 13.3179C9.90341 12.5229 9.30741 11.5479 9.13141 11.2479C8.83841 10.7419 9.45141 10.6699 10.0094 9.61393C10.1094 9.40393 10.0584 9.23893 9.98441 9.08993C9.9094 8.93993 9.31241 7.46993 9.06241 6.88393C8.82241 6.29993 8.57541 6.37393 8.39041 6.37393C7.81441 6.32393 7.39341 6.33193 7.02241 6.71793C5.4084 8.49193 5.81541 10.3219 7.19641 12.2679C9.91041 15.8199 11.3564 16.4739 14.0004 17.3819C14.7144 17.6089 15.3654 17.5769 15.8804 17.5029C16.4544 17.4119 17.6474 16.7819 17.8964 16.0769C18.1514 15.3719 18.1514 14.7869 18.0764 14.6519C18.0024 14.5169 17.8064 14.4419 17.5064 14.3069Z"
                      fill="white"
                    />
                    <path
                      d="M20.5195 3.44894C12.8305 -3.98406 0.105512 1.40694 0.100512 11.8929C0.100512 13.9889 0.649512 16.0329 1.69551 17.8379L-0.000488281 23.9999L6.33451 22.3479C14.2395 26.6179 23.9955 20.9479 23.9995 11.8989C23.9995 8.72295 22.7595 5.73394 20.5045 3.48794L20.5195 3.44894ZM22.0015 11.8659C21.9955 19.4989 13.6165 24.2659 6.98951 20.3699L6.62951 20.1559L2.87951 21.1309L3.88451 17.4859L3.64551 17.1109C-0.478488 10.5459 4.25951 1.96594 12.0715 1.96594C13.3761 1.96266 14.6683 2.21817 15.8735 2.71767C17.0787 3.21717 18.1728 3.95075 19.0925 4.87594C20.0173 5.78952 20.7508 6.87815 21.2502 8.07829C21.7497 9.27843 22.0051 10.566 22.0015 11.8659Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_301_1537">
                      <rect
                        width="24"
                        height="24"
                        fill="white"
                        transform="translate(-0.000488281)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              }
              iconStyle={{
                background: 'linear-gradient(63deg, #439262 0%, #52D285 100%)',
              }}
            >
              Написать
              <br />в Whatsapp
            </SocialContact>
            <SocialContact
              onClick={() => setSelectedContact('vkontakte')}
              isSelected={selectedContact === 'vkontakte'}
              svg={
                <svg
                  className="h-[16px] w-[16px] md:h-[24px] md:w-[24px]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <g clipPath="url(#clip0_72_3236)">
                    <path
                      d="M12.145 19.5C15.617 19.5 14.379 17.302 14.647 16.67C14.643 16.198 14.639 15.744 14.655 15.468C14.875 15.53 15.394 15.793 16.466 16.835C18.121 18.505 18.544 19.5 19.881 19.5H22.342C23.122 19.5 23.528 19.177 23.731 18.906C23.927 18.644 24.119 18.184 23.909 17.468C23.36 15.744 20.158 12.767 19.959 12.453C19.9912 12.3935 20.0256 12.3351 20.062 12.278H20.06C20.692 11.443 23.104 7.829 23.459 6.383C23.4602 6.38051 23.4609 6.37778 23.461 6.375C23.653 5.715 23.477 5.287 23.295 5.045C23.021 4.683 22.585 4.5 21.996 4.5H19.535C18.711 4.5 18.086 4.915 17.77 5.672C17.241 7.017 15.755 9.783 14.641 10.762C14.6162 9.68445 14.6185 8.60644 14.648 7.529C14.684 5.994 14.8 4.5 13.207 4.5H9.339C8.341 4.5 7.386 5.59 8.42 6.884C9.324 8.018 8.745 8.65 8.94 11.796C8.18 10.981 6.828 8.78 5.872 5.967C5.604 5.206 5.198 4.501 4.055 4.501H1.594C0.596 4.501 0 5.045 0 5.956C0 8.002 4.529 19.5 12.145 19.5ZM4.055 6.001C4.272 6.001 4.294 6.001 4.455 6.458C5.434 9.341 7.63 13.607 9.234 13.607C10.439 13.607 10.439 12.372 10.439 11.907L10.438 8.205C10.372 6.98 9.926 6.37 9.633 6L13.141 6.004C13.143 6.021 13.121 10.099 13.151 11.087C13.151 12.49 14.265 13.294 16.004 11.534C17.839 9.463 19.108 6.367 19.159 6.241C19.234 6.061 19.299 6 19.535 6H22.006L22.004 6.009C21.779 7.059 19.558 10.405 18.815 11.444L18.781 11.494C18.454 12.028 18.188 12.618 18.826 13.448C18.884 13.518 19.036 13.682 19.256 13.91C19.94 14.616 22.286 17.03 22.494 17.99C22.356 18.012 22.206 17.996 19.881 18.001C19.386 18.001 18.999 17.261 17.522 15.771C16.194 14.479 15.332 13.951 14.547 13.951C13.023 13.951 13.134 15.188 13.148 16.684C13.153 18.306 13.143 17.793 13.154 17.895C13.065 17.93 12.81 18 12.145 18C5.8 18 1.668 7.929 1.509 6.004C1.564 5.999 2.321 6.002 4.055 6.001Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_72_3236">
                      <rect width="24" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              }
              iconStyle={{
                background: 'linear-gradient(63deg, #55749F 0%, #6E9BDA 100%)',
              }}
            >
              Написать
              <br />в ВКонтакте
            </SocialContact>
            <SocialContact
              onClick={() => setSelectedContact('telegram')}
              isSelected={selectedContact === 'telegram'}
              svg={
                <svg
                  className="h-[16px] w-[16px] md:h-[24px] md:w-[24px]"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <g clipPath="url(#clip0_72_3268)">
                    <path
                      d="M23.53 1.9663C23.3401 1.79249 23.1073 1.67238 22.8556 1.6183C22.6039 1.56421 22.3423 1.57811 22.0978 1.65857L0.995214 8.61486C0.420104 8.80443 0.0301044 9.3178 0.00165128 9.92263C-0.026755 10.5275 0.313323 11.0752 0.868042 11.318L6.08687 13.6014L7.66145 20.9043C7.72684 21.2076 7.88082 21.4779 8.20703 21.561C8.53698 21.645 8.77009 21.4647 9.01628 21.2804L12.8891 18.3805L17.4167 22.0854C17.6804 22.3013 18.0027 22.4139 18.3314 22.4139C18.4906 22.4138 18.6487 22.3875 18.7995 22.3363C19.276 22.1747 19.6292 21.7858 19.7444 21.296L23.9616 3.36618C24.0204 3.11554 24.0114 2.85377 23.9356 2.60775C23.8597 2.36173 23.7197 2.14033 23.53 1.9663ZM9.35364 14.9098C9.35106 14.9159 9.34853 14.9228 9.34614 14.931L8.47313 17.9811L7.49889 13.4626L14.1981 9.74047L9.51432 14.6379C9.44087 14.7152 9.38593 14.8082 9.35364 14.9098ZM9.63071 19.0594L10.0272 17.674L10.4065 16.3489L11.7654 17.461L9.63071 19.0594ZM22.5894 3.04339L18.3723 20.9732C18.3702 20.9821 18.3674 20.9944 18.3468 21.0013C18.3264 21.0083 18.3164 21.0004 18.3094 20.9946L13.3551 16.9404L13.3547 16.9401L11.0593 15.0617L18.4338 7.35088C18.5504 7.22901 18.6194 7.06939 18.6283 6.90099C18.6372 6.7326 18.5854 6.56659 18.4824 6.43311C18.3793 6.29962 18.2318 6.2075 18.0666 6.17348C17.9015 6.13946 17.7296 6.1658 17.5822 6.24772L6.66259 12.3147L1.43307 10.0266C1.41714 10.0197 1.40837 10.0158 1.40964 9.98882C1.4109 9.96196 1.42 9.95891 1.4365 9.95347L22.5391 2.99722C22.5493 2.99389 22.5608 2.99005 22.5778 3.00552C22.5947 3.02108 22.5919 3.03289 22.5894 3.04339Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_72_3268">
                      <rect width="24" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              }
              iconStyle={{
                background: 'linear-gradient(63deg, #597CFB 0%, #73A1FF 100%)',
              }}
            >
              Написать
              <br />в Telegram
            </SocialContact>
            <SocialContact
              onClick={() => setSelectedContact('phone')}
              isSelected={selectedContact === 'phone'}
              svg={
                <svg
                  className="h-[16px] w-[16px] md:h-[24px] md:w-[24px]"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <g clipPath="url(#clip0_72_3301)">
                    <path
                      d="M22.5262 16.9455C22.4865 16.9125 17.9948 13.698 16.776 13.9088C16.1903 14.0122 15.855 14.4113 15.1838 15.2115C14.9982 15.4341 14.8084 15.6531 14.6145 15.8685C14.1902 15.7303 13.7764 15.5619 13.3762 15.3645C11.3104 14.3588 9.64124 12.6896 8.6355 10.6237C8.43815 10.2236 8.26972 9.80975 8.1315 9.3855C8.352 9.18375 8.661 8.9235 8.793 8.8125C9.58875 8.145 9.98775 7.80975 10.0912 7.22325C10.3035 6.009 7.0875 1.5135 7.0545 1.473C6.90804 1.26529 6.7173 1.09269 6.49603 0.967663C6.27476 0.842632 6.02849 0.768289 5.775 0.75C4.4715 0.75 0.75 5.577 0.75 6.39075C0.75 6.438 0.81825 11.241 6.741 17.2658C12.759 23.1817 17.562 23.25 17.6092 23.25C18.423 23.25 23.25 19.5285 23.25 18.225C23.2317 17.9714 23.1573 17.7251 23.0321 17.5038C22.907 17.2825 22.7342 17.0918 22.5262 16.9455ZM17.5267 21.7455C16.8713 21.6915 12.8407 21.1597 7.8015 16.209C2.82525 11.1427 2.307 7.101 2.25525 6.47475C3.23833 4.93173 4.42559 3.52877 5.78475 2.304C5.81475 2.334 5.8545 2.379 5.9055 2.4375C6.94787 3.86042 7.84581 5.3837 8.586 6.98475C8.34529 7.2269 8.09088 7.45503 7.824 7.668C7.41014 7.98334 7.03011 8.34075 6.69 8.7345L6.50775 8.9895L6.56175 9.29775C6.72047 9.9853 6.96356 10.6506 7.2855 11.2785C8.43892 13.647 10.3528 15.5607 12.7215 16.7137C13.3493 17.0361 14.0146 17.2795 14.7023 17.4382L15.0105 17.4923L15.2655 17.31C15.6607 16.9684 16.0196 16.5869 16.3365 16.1715C16.5712 15.891 16.8855 15.5168 17.004 15.411C18.6096 16.1505 20.1368 17.0495 21.5625 18.0945C21.6248 18.147 21.6683 18.1875 21.6975 18.2137C20.4729 19.5733 19.0699 20.7609 17.5267 21.744V21.7455Z"
                      fill="#0E0E1C"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_72_3301">
                      <rect width="24" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              }
              iconStyle={{
                background:
                  'linear-gradient(341deg, rgba(96, 139, 246, 0.16) 0%, rgba(96, 139, 246, 0.00) 100%), #EDEDED',
              }}
            >
              Перезвоните
              <br />
              мне
            </SocialContact>
          </div>
          <div className="mt-[10px] flex w-full max-w-[490px] flex-col items-center gap-y-[10px] md:mt-[15px] md:items-start md:gap-y-[15px]">
            <MaskedInput
              className="h-[60px] w-full rounded-[7px] bg-white px-[20px] text-[13px] font-normal leading-[125%] outline-none md:h-[85px] md:px-[35px] md:text-[19px]"
              style={{
                color: 'rgba(14, 14, 28, 0.90)',
                border: '2px solid rgba(14, 14, 24, 0.30)',
                letterSpacing: '0.76px',
              }}
              showMask={phone == '7'}
              onKeyDown={
                isButtonDisabled
                  ? undefined
                  : (e) => handleEnterKeyDown(e, phone, selectedContact)
              }
              // showMask
              placeholder="Номер телефона"
              onChange={(e) => {
                // console.log('e.target.value :>> ', e.target.value)
                const value = e.target.value.replace(/[^0-9]/g, '')
                setPhone(
                  !value
                    ? '7'
                    : value == '77' || value == '78'
                    ? '7'
                    : Number(value)
                )
                // if (value !== '77' && value !== '78') setPhone(value)
                // else setPhone('')
              }}
              // keepCharPositions
              mask={[
                '+',
                '7',
                ' ',
                '(',
                /[1-9]/,
                /\d/,
                /\d/,
                ')',
                ' ',
                /\d/,
                /\d/,
                /\d/,
                '-',
                /\d/,
                /\d/,
                /\d/,
                /\d/,
              ]}
              value={
                phone
                  ? phone.toString().substr(0, 1) == '7'
                    ? phone.toString().substring(1)
                    : phone.toString()
                  : ''
              }
            />
            <Button
              fullWidth
              onClick={() => onSubmit(phone, selectedContact)}
              disabled={isButtonDisabled}
              addIcon={false}
            >
              {isQuizSended === 'inProcess'
                ? 'Квиз отправляется...'
                : 'Обсудить шоу'}
            </Button>
            <div className="mt-[10px] w-[80%] text-center text-[11px] font-normal leading-[145%] text-[#A8A8CA] md:text-left md:text-[16px]">
              Нажимая на кнопку, вы соглашаетесь на{' '}
              <a
                href="/doc/privacy.doc"
                download
                className="cursor-pointer underline"
              >
                обработку персональных данных
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-[30px] max-w-[70%] text-[17px] font-bold leading-[125%] text-[#276b2b] md:mt-[50px] md:text-[24px]">
          Квиз успешно отправлен!
          <br />
          Пожалуйста ожидайте нашего звонка!
        </div>
      )}
    </div>
  )
}

export default QuizPageFinal
