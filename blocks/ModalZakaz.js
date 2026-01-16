'use client'

import React, { useState } from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Button from './components/Button'
import DivText from './components/DivText'
import { useAtom, useAtomValue } from 'jotai'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import MaskedInput from 'react-text-mask'
import { postData } from '@helpers/CRUD'
import Modal from './components/Modal'
import yandexAimAtom from '@state/atoms/yandexAimAtom'
import { reachGoal } from 'app/components/metrika'

const Title = ({ className }) => (
  <div
    className={cn(
      'w-[250px] text-center font-buyan text-[29px] font-bold leading-[100%] text-black phoneH:w-[280px] phoneH:text-[32px] sm:w-[320px] sm:text-[36px] md:w-[360px] md:text-[42px] tablet:w-[560px] tablet:text-[64px]',
      className
    )}
  >
    <SpanGradientTitle>Оставьте заявку</SpanGradientTitle>, чтобы
    <br />
    обсудить шоу для вас
  </div>
)

const OnSuccess = ({ visible }) => (
  <div
    className={cn(
      'absolute bottom-0 left-0 right-0 top-0 bg-white duration-500',
      visible ? 'z-20 opacity-100' : '-z-10 opacity-0'
    )}
    style={
      {
        // background: 'url("/img/success.png")',
      }
    }
  >
    <div className="flex w-full flex-col items-center px-[18px] py-[60px] text-center text-[29px] font-bold leading-[100%] phoneH:text-[32px] sm:text-[36px] md:items-start md:px-[65px] md:text-[42px] tablet:items-center tablet:text-[64px]">
      <SpanGradientTitle className="font-buyan">
        Спасибо за заявку!
      </SpanGradientTitle>
      <DivText
        className="mt-[25px] w-full max-w-[270px] text-center md:max-w-[220px] md:text-left tablet:max-w-[460px] tablet:text-center"
        leadingClass="leading-[135%]"
        textColorClass="text-[#8888AB]"
        textFontClass="font-medium"
      >
        <span className="font-bold">Уже скоро с вами свяжутся</span> для
        консультации и обсуждения подробностей
      </DivText>
    </div>
    <img
      // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
      className="absolute bottom-0 right-0 min-w-[107%] object-contain md:min-w-0"
      alt="magican"
      src="/img/success.png"
      // style={{
      //   filter: 'blur(0.8469998836517334px)',
      //   // background:
      //   //   'linear-gradient(320deg, rgba(96, 139, 246, 0.60) 0%, rgba(96, 139, 246, 0.00) 32.66%, rgba(134, 123, 255, 0.00) 78.17%, rgba(134, 123, 255, 0.60) 100%), rgba(0, 0, 0, 0.06)',
      //   // backgroundBlendMode: 'color-dodge, normal',
      // }}
      draggable={false}
    />
  </div>
)

const Social = ({ text, href }) => (
  <a
    className="flex h-[40px] items-center justify-center rounded-full border border-[#0e0e1ce6] border-opacity-20 px-[40px] text-[15px] font-medium leading-[135%] text-[#0e0e1ce6] underline duration-300 hover:border-[#FFCA45] hover:text-[#FFCA45] md:h-[50px] md:text-[21px] "
    href={href}
    target="_blank"
  >
    {text}
  </a>
)

const OnUnsuccess = ({ visible }) => (
  <div
    className={cn(
      'absolute bottom-0 left-0 right-0 top-0 bg-white duration-500',
      visible ? 'z-20 opacity-100' : '-z-10 opacity-0'
    )}
    style={
      {
        // background: 'url("/img/success.png")',
      }
    }
  >
    <div className="flex w-full flex-col items-center px-[18px] py-[60px] text-center text-[29px] font-bold leading-[100%] phoneH:text-[32px] sm:text-[36px] md:px-[65px] md:text-[42px] tablet:text-[64px]">
      <span
        className="font-buyan"
        style={{
          background: 'linear-gradient(51deg, #ff4949 0%, #ff6c6c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Что-то пошло не так!
      </span>
      <DivText
        className="mt-[25px] w-full max-w-[190px] text-center leading-[135%] md:max-w-[250px] tablet:max-w-[330px]"
        textColorClass="text-[#8888AB]"
        textFontClass="font-medium"
      >
        Пожалуйста <span className="font-bold">свяжитесь со мной</span> по
        одному из контактов ниже
      </DivText>
      <div className="mt-[25px] flex flex-col gap-y-[10px] md:mt-[40px] tablet:gap-y-[20px]">
        <Social text="+7-913-837-0020" href="tel:+79138370020" />
        <Social
          text="Whatsapp"
          href="https://api.whatsapp.com/send?phone=79138370020"
        />
        <Social text="Telegram" href="https://t.me/escalion" />
        <Social text="Instagram" href="https://instagram.com/magbelinskiy" />
        <Social text="VKontakte" href="https://vk.com/escalion" />
      </div>
    </div>
    {/* <img
      // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
      className="absolute bottom-0 right-0 min-w-[107%] object-contain md:min-w-0"
      alt="magican"
      src="/img/success.png"
      // style={{
      //   filter: 'blur(0.8469998836517334px)',
      //   // background:
      //   //   'linear-gradient(320deg, rgba(96, 139, 246, 0.60) 0%, rgba(96, 139, 246, 0.00) 32.66%, rgba(134, 123, 255, 0.00) 78.17%, rgba(134, 123, 255, 0.60) 100%), rgba(0, 0, 0, 0.06)',
      //   // backgroundBlendMode: 'color-dodge, normal',
      // }}
      draggable={false}
    /> */}
  </div>
)

const ModalZakaz = () => {
  const [showModalZakaz, setShowModalZakaz] = useAtom(showModalZakazAtom)
  const yandexAim = useAtomValue(yandexAimAtom)
  const [phone, setPhone] = useState()
  const [success, setSuccess] = useState()
  // const { reachGoal } = useMetrica()

  const onSubmit = async () => {
    if (phone == 79874565544) return
    setSuccess(null)
    await postData(
      `/api/requests`,
      { phone, yandexAim },
      (data) => {
        setSuccess(true)
      },
      (error) => setSuccess(false),
      true
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
    if (typeof yandexAim === 'string') return reachGoal(yandexAim)
  }

  const isButtonDisabled =
    success !== undefined || !phone || phone?.toString().length < 11
  const handleEnterKeyDown = (event) => {
    if (!isButtonDisabled && event.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <Modal show={showModalZakaz} closeFunc={() => setShowModalZakaz(false)}>
      <OnSuccess visible={showModalZakaz === 'success' || success === true} />
      <OnUnsuccess
        visible={showModalZakaz === 'unsuccess' || success === false}
      />
      <Title />
      <DivText
        className="mt-[25px] w-full max-w-[290px] text-center leading-[135%] md:max-w-[380px] tablet:max-w-full"
        textColorClass="text-[#8888AB]"
        textFontClass="font-medium"
      >
        Заполните форму и мы свяжемся с Вами{' '}
        <span className="font-bold">
          в течение <span className="whitespace-nowrap">15 минут</span>
        </span>
        , чтобы подробно обсудить шоу.
      </DivText>
      <DivText
        className="mt-[15px] text-center leading-[135%]"
        size="small"
        textColorClass="text-[#8888AB]"
      >
        При необходимости договоримся о личной встрече.
      </DivText>
      <div
        className="mt-[20px] flex w-full items-center rounded-[7px] md:mt-[35px]"
        style={{
          background:
            'linear-gradient(341deg, rgba(96, 139, 246, 0.16) 0%, rgba(96, 139, 246, 0.00) 100%), linear-gradient(0deg, #EDEDED 0%, #EDEDED 100%), #FFF',
          boxShadow: '0px 25px 36px 0px rgba(255, 255, 255, 0.20) inset',
        }}
      >
        {/* <input
            className="w-full text-[#0e0e1ce6] py-[30px] px-[35px] text-[19px] font-medium bg-transparent outline-none"
            style={{
              lineHeight: '125%',
              letterSpacing: '0.76px',
            }}
            placeholder="+7 ("
          /> */}
        <MaskedInput
          className="w-full bg-transparent px-[15px] py-[20px] text-[18px] text-[#0e0e1ce6] outline-none md:px-[35px] md:py-[25px] md:text-[20px] tablet:text-[22px]"
          showMask={phone == '7'}
          placeholder="Номер телефона"
          onKeyDown={handleEnterKeyDown}
          // showMask
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
          aria-label="Phone"
        />
      </div>
      <div className="w-full">
        <Button
          noShadow
          fullWidth
          className="mt-[15px] max-w-full"
          onClick={onSubmit}
          disabled={isButtonDisabled}
          addIcon={false}
        >
          {success !== undefined ? 'Отправляем заявку' : 'Перезвоните мне'}
        </Button>
      </div>
      <DivText
        className="mt-[25px] text-center leading-[135%]"
        size="small"
        textColorClass="text-[#8888AB]"
        textFontClass="font-normal"
      >
        Нажимая на кнопку, вы соглашаетесь на{' '}
        <a
          href="/doc/privacy.doc"
          download
          className="cursor-pointer underline"
        >
          обработку персональных данных
        </a>
      </DivText>
    </Modal>
  )
}

export default ModalZakaz
