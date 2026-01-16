'use client'

import React, { useState } from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Button from './components/Button'
import DivContent from './components/DivContent'
import MaskedInput from 'react-text-mask'
import { postData } from '@helpers/CRUD'
import { useSetAtom } from 'jotai'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import BackLight from './components/BackLight'
import BackLight2 from './components/BackLight2'
import yandexAimAtom from '@state/atoms/yandexAimAtom'
import { reachGoal } from 'app/components/metrika'

const Title = ({ className }) => (
  <div
    className={cn(
      'text-left font-buyan text-[29px] font-bold leading-[100%] text-white phoneH:text-[32px] sm:text-[36px] md:text-center md:text-[42px] tablet:text-[64px] xl:text-left',
      className
    )}
  >
    <SpanGradientTitle>Заполните анкету</SpanGradientTitle>, чтобы
    <br />
    договориться о шоу
  </div>
)

const Item = ({ num, text }) => (
  <div className="flex items-center gap-x-[15px]">
    <div
      className="flex h-[32px] w-[32px] items-center justify-center rounded-[90px] text-[11px] font-semibold text-white md:h-[45px] md:w-[45px] md:text-[16px]"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.05)',
        background:
          'linear-gradient(343deg, rgba(96, 139, 246, 0.20) 0%, rgba(96, 139, 246, 0.00) 83.72%), linear-gradient(63deg, rgba(11, 11, 21, 0.20) 0%, rgba(26, 26, 50, 0.20) 100%)',
        backgroundBlendMode: 'color-dodge, normal',
        boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
        backdropFilter: 'blur(3px)',
      }}
    >
      {num}
    </div>
    <div className="text-[12px] font-normal leading-[125%] text-white md:text-[21px] md:font-medium md:leading-[135%] xl:max-w-[239px]">
      {text}
    </div>
  </div>
)

const AnketaBlock = () => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)
  const [phone, setPhone] = useState()
  const [name, setName] = useState()

  const onSubmit = async () => {
    if (phone == 79874565544) return
    setYandexAim(null)
    await postData(
      `/api/requests`,
      { phone, name },
      (data) => setShowModalZakaz('success'),
      (error) => setShowModalZakaz('unsuccess')
      // (data) => {
      //   snackbar.success(messages[itemName]?.add?.success)
      //   if (props['set' + capitalizeFirstLetter(itemName)])
      //     props['set' + capitalizeFirstLetter(itemName)](data)
      //   // setEvent(data)
      // },
      // (error) => {
      //   snackbar.error(messages[itemName]?.add?.error)
      //   setErrorCard(itemName + item._id)
      //   const data = {
      //     errorPlace: 'CREATE ERROR',
      //     itemName,
      //     item,
      //     error,
      //   }
      //   addErrorModal(data)
      //   console.log(data)
      // }
    )
    return reachGoal('poluchit_zvonok')
  }

  const isButtonDisabled = !phone || phone?.toString().length < 11

  const handleEnterKeyDown = (event) => {
    if (!isButtonDisabled && event.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <div className="relative mb-[40px] mt-[85px] flex w-full flex-col items-center md:mb-[100px] md:mt-[161px] xl:mt-[185px]">
      <div
        className="absolute right-0 top-[11px] z-10 aspect-[235/303] w-[100px] md:hidden"
        style={{
          background: 'url("/img/hand2.png")',
          mixBlendMode: 'hard-light',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className={cn(
          'absolute -top-[90px] left-[50px] aspect-[1230/690] h-[690px] -translate-x-[70%] rotate-[105deg] scale-[65%]',
          'md:-top-[200px] md:-translate-x-[55%] md:scale-[100%]',
          'tablet:-top-[220px] tablet:left-[210px] tablet:-translate-x-[55%]',
          'xl:-top-[160px]'
        )}
        style={{
          background: 'url("/img/smoke.png")',
          mixBlendMode: 'color-dodge',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className={cn(
          'absolute right-0 top-[240px] aspect-[1230/690] h-[690px] translate-x-1/2 rotate-[105deg] scale-[65%]',
          'md:right-0 md:top-[360px] md:scale-[100%]',
          'tablet:right-[200px] tablet:top-[400px]',
          'xl:right-[120px] xl:top-[200px]'
        )}
        style={{
          background: 'url("/img/smoke.png")',
          mixBlendMode: 'color-dodge',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <BackLight
        className={cn(
          'bottom-auto scale-[50%]',
          '-right-[80px] top-[50%] hidden -translate-y-1/2 translate-x-1/2',
          'md:-right-[220px] md:top-[300px] md:block md:-translate-y-1/2 md:translate-x-1/2 md:scale-[100%]',
          'xl:bottom-0 xl:right-[calc(60%-800px)] xl:top-auto xl:-translate-y-[120px]'
        )}
        opacity={50}
      />
      <BackLight2
        className={cn(
          'scale-[50%]',
          '-left-[400px] -top-[280px]',
          'md:-left-[530px] md:-top-[380px] md:scale-[100%]',
          'xl:-left-[290px]'
        )}
        opacity={30}
      />
      <BackLight2
        className={cn(
          'scale-[50%]',
          '-right-[280px] -top-[130px]',
          'md:hidden',
          'border border-red-400'
        )}
        opacity={30}
      />
      <DivContent
        noMargin
        className="flex flex-col items-center gap-y-[20px] xl:flex-row"
      >
        <div className="flex flex-col items-start justify-center md:items-center xl:items-start">
          <Title />
          <div className="mt-[20px] flex w-full max-w-[490px] flex-col gap-x-[30px] gap-y-[5px] md:mt-[30px] xl:mt-[52px] xl:max-w-full xl:flex-row">
            <Item num="01" text="Обсудим программу" />
            <Item num="02" text="Если необходимо, договоримся о встрече" />
          </div>
          <div className="mt-[25px] flex w-full max-w-[490px] flex-col items-center gap-y-[10px] md:mt-[45px] md:items-start md:gap-y-[15px] xl:mt-[59px]">
            <input
              className="h-[60px] w-full rounded-[7px] bg-white px-[20px] text-[13px] font-normal leading-[125%] outline-none md:h-[85px] md:px-[35px] md:text-[19px]"
              style={{
                color: 'rgba(14, 14, 28, 0.90)',
                border: '1px solid rgba(255, 255, 255, 0.30)',
                letterSpacing: '0.76px',
              }}
              placeholder="Введите имя"
              onChange={(e) => setName(e.target.value)}
            />
            {/* <input
            className="rounded-[7px] bg-white px-[35px] py-[30px] text-[19px] font-normal leading-[125%] outline-none"
            style={{
              color: 'rgba(14, 14, 28, 0.90)',
              border: '1px solid rgba(255, 255, 255, 0.30)',
              letterSpacing: '0.76px',
            }}
            placeholder="Номер телефона"
          /> */}
            <MaskedInput
              className="h-[60px] w-full rounded-[7px] bg-white px-[20px] text-[13px] font-normal leading-[125%] outline-none md:h-[85px] md:px-[35px] md:text-[19px]"
              style={{
                color: 'rgba(14, 14, 28, 0.90)',
                border: '1px solid rgba(255, 255, 255, 0.30)',
                letterSpacing: '0.76px',
              }}
              showMask={phone == '7'}
              onKeyDown={handleEnterKeyDown}
              // showMask
              placeholder="Номер телефона"
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '')
                setPhone(
                  !value
                    ? '7'
                    : value == '77' || value == '78'
                    ? '7'
                    : Number(value)
                )
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
            <Button fullWidth onClick={onSubmit} disabled={isButtonDisabled}>
              Получить звонок
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
        </div>
        <div
          className="mt-[30px] aspect-[1584/1021] w-[80%] opacity-100 xl:-mr-[200px] xl:mt-0 xl:w-[700px]"
          style={{
            background: 'url("/img/hands_with_cards.png")',
            mixBlendMode: 'screen',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </DivContent>
    </div>
  )
}

export default AnketaBlock
