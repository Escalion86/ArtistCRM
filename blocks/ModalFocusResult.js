'use client'

import React, { useState } from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Button from './components/Button'
import DivText from './components/DivText'
import { useAtom, useAtomValue } from 'jotai'
import MaskedInput from 'react-text-mask'
import { postData } from '@helpers/CRUD'
import Modal from './components/Modal'
import yandexAimAtom from '@state/atoms/yandexAimAtom'
import { reachGoal } from 'app/components/metrika'
import showModalFocusResultAtom from '@state/atoms/showModalFocusResultAtom'
import Link from 'next/link'

const OnSuccess = ({ visible }) => (
  <div
    className={cn(
      'absolute top-0 right-0 bottom-0 left-0 bg-white duration-500',
      visible ? 'z-20 opacity-100' : '-z-10 opacity-0'
    )}
    style={
      {
        // background: 'url("/img/success.png")',
      }
    }
  >
    <div className="phoneH:text-[32px] tablet:items-center tablet:text-[64px] flex w-full flex-col items-center px-[18px] py-[60px] text-center text-[29px] leading-[100%] font-bold sm:text-[36px] md:items-start md:px-[65px] md:text-[42px]">
      <SpanGradientTitle className="font-buyan">
        Спасибо за заявку!
      </SpanGradientTitle>
      <DivText
        className="tablet:max-w-[460px] tablet:text-center mt-[25px] w-full max-w-[270px] text-center md:max-w-[220px] md:text-left"
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
      className="absolute right-0 bottom-0 min-w-[107%] object-contain md:min-w-0"
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
    className="border-opacity-20 flex h-[40px] items-center justify-center rounded-full border border-[#0e0e1ce6] px-[40px] text-[15px] leading-[135%] font-medium text-[#0e0e1ce6] underline duration-300 hover:border-[#FFCA45] hover:text-[#FFCA45] md:h-[50px] md:text-[21px]"
    href={href}
    target="_blank"
  >
    {text}
  </a>
)

const OnUnsuccess = ({ visible }) => (
  <div
    className={cn(
      'absolute top-0 right-0 bottom-0 left-0 bg-white duration-500',
      visible ? 'z-20 opacity-100' : '-z-10 opacity-0'
    )}
    style={
      {
        // background: 'url("/img/success.png")',
      }
    }
  >
    <div className="phoneH:text-[32px] tablet:text-[64px] flex w-full flex-col items-center px-[18px] py-[60px] text-center text-[29px] leading-[100%] font-bold sm:text-[36px] md:px-[65px] md:text-[42px]">
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
        className="tablet:max-w-[330px] mt-[25px] w-full max-w-[190px] text-center leading-[135%] md:max-w-[250px]"
        textColorClass="text-[#8888AB]"
        textFontClass="font-medium"
      >
        Пожалуйста <span className="font-bold">свяжитесь со мной</span> по
        одному из контактов ниже
      </DivText>
      <div className="tablet:gap-y-[20px] mt-[25px] flex flex-col gap-y-[10px] md:mt-[40px]">
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

const ModalFocusResult = () => {
  const [showModalFocusResult, setShowModalFocusResult] = useAtom(
    showModalFocusResultAtom
  )
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
    <Modal
      show={showModalFocusResult}
      closeFunc={() => setShowModalFocusResult(false)}
    >
      <OnSuccess visible={success === true} />
      <OnUnsuccess visible={success === false} />
      <div className="font-buyan phoneH:w-[280px] phoneH:text-[32px] tablet:w-[560px] tablet:text-[64px] w-[250px] text-center text-[29px] leading-[100%] font-bold text-black sm:w-[320px] sm:text-[36px] md:w-[360px] md:text-[42px]">
        <SpanGradientTitle>
          {showModalFocusResult === 'right' ? 'КРУТО!' : 'А ВЫ НЕ ТАК ПРОСТЫ!'}
        </SpanGradientTitle>
      </div>
      <DivText
        className="tablet:max-w-full mt-[25px] w-full max-w-[320px] text-center leading-[135%] md:max-w-[320px]"
        textColorClass="text-[#8888AB]"
        textFontClass="font-medium"
      >
        {showModalFocusResult === 'right' ? (
          <>Поделитесь впечатлением!</>
        ) : (
          <>
            Думаю Вас не просто удивить,
            <br />
            но такое мне даже нравится!
          </>
        )}
        <br />
        Оставьте свой номер или позвоните мне
        <br />
        <span className="font-bold">прямо сейчас</span>!{' '}
        <Link
          href="tel:+79138370020"
          className="cursor-pointer font-bold underline duration-300 hover:text-[#FFCA45]"
          onClick={() => reachGoal('after_focus_click_number')}
          target="_blank"
          prefetch={false}
        >
          8 (913) 837-00-20
        </Link>
        <br />
        Расскажете о предстоящем событии
      </DivText>
      <DivText
        className="tablet:max-w-[460px] mt-[15px] max-w-[265px] text-center leading-[135%] md:max-w-[360px]"
        size="small"
        textColorClass="text-[#8888AB]"
      >
        При необходимости договоримся о личной встрече, и я смогу поразить Вас{' '}
        {'"вживую"'}
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
          className="tablet:text-[22px] w-full bg-transparent px-[15px] py-[20px] text-[18px] text-[#0e0e1ce6] outline-none md:px-[35px] md:py-[25px] md:text-[20px]"
          showMask={phone == '7'}
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

export default ModalFocusResult
