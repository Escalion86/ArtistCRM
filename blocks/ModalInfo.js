'use client'

import React from 'react'
import cn from 'classnames'
import SpanGradientTitle from './components/SpanGradientTitle'
import Button from './components/Button'
import DivText from './components/DivText'
import { useAtom } from 'jotai'
import modalInfoAtom from '@state/atoms/modalInfoAtom'
import Modal from './components/Modal'

const Title = ({ children, className }) => (
  <div
    className={cn(
      'w-full text-left font-buyan text-[29px] font-bold leading-[100%] text-black phoneH:text-[32px] sm:text-[36px] md:text-[42px] tablet:text-[64px]',
      className
    )}
  >
    <SpanGradientTitle className="font-buyan">{children}</SpanGradientTitle>
  </div>
)

const ModalInfo = ({}) => {
  const [modalInfo, setModalInfo] = useAtom(modalInfoAtom)

  return (
    <Modal show={modalInfo} closeFunc={() => setModalInfo(undefined)}>
      <Title>{modalInfo?.title}</Title>
      <DivText
        className="mb-[45px] mt-[30px] w-full text-left leading-[135%]"
        leadingClass="leading-[135%]"
        textColorClass="text-[#8888AB]"
        textFontClass="font-medium"
      >
        {modalInfo?.text
          ? typeof modalInfo.text === 'function'
            ? modalInfo.text()
            : modalInfo.text
          : undefined}
      </DivText>
      <Button
        addIcon={false}
        onClick={() => {
          modalInfo?.onConfirm()
          setModalInfo(undefined)
        }}
      >
        {modalInfo?.buttonName}
      </Button>
    </Modal>
  )
}

export default ModalInfo
