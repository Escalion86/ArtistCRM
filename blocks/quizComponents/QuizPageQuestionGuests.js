'use client'

import React from 'react'
import cn from 'classnames'
import { SPECTATORS } from '@helpers/constants'

const QuizChekBox = ({ children, onClick }) => (
  <div
    className="group flex cursor-pointer items-center gap-x-[13px] rounded-[10px] bg-gradient-to-r from-[#EDEDED] to-[#EDEDED] bg-size-200 bg-pos-0 py-[7px] pl-[8px] pr-[17px] transition-all duration-300 hover:from-[#692DC1] hover:to-[#AC80EC] hover:bg-pos-100 md:py-[10px] md:pl-[20px] md:pr-[30px]"
    style={{
      boxShadow:
        '3px 3px 25px 0px rgba(255, 255, 255, 0.03) inset, 0px 25px 36px 0px rgba(255, 255, 255, 0.20) inset',
    }}
    onClick={onClick}
  >
    <div className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-white md:h-[32px] md:w-[32px]">
      <div
        className="hidden h-[10px] w-[10px] rounded-full group-hover:block md:h-[16px] md:w-[16px]"
        style={{
          background: 'linear-gradient(63deg, #692DC1 0%, #AC80EC 100%)',
        }}
      />
    </div>
    <div className=" whitespace-nowrap text-[13px] font-medium leading-[145%] text-[#0E0E1C] group-hover:text-white md:text-[19px]">
      {children}
    </div>
  </div>
)

const QuizPageQuestionGuests = ({ show, onChoose }) => {
  return (
    <div
      className={cn(
        'w-full transition-all duration-500',
        show
          ? 'relative z-10 opacity-100'
          : 'absolute left-0 right-0 top-0 opacity-0'
      )}
    >
      <div className="flex flex-wrap gap-x-[10px] gap-y-[10px] md:gap-x-[40px] md:gap-y-[30px]">
        {SPECTATORS.map((value) => (
          <QuizChekBox key={value} onClick={() => onChoose(value)}>
            {value} человек
          </QuizChekBox>
        ))}
      </div>
      <div className="relative mt-[30px] h-[195px] w-full md:mt-[70px] md:h-[442px] xl:mt-[90px]">
        <div
          className="absolute bottom-0 left-0 right-0 top-0 rounded-[30px]"
          style={{
            background:
              'linear-gradient(320deg, rgba(96, 139, 246, 0.60) 0%, rgba(96, 139, 246, 0.00) 32.66%, rgba(134, 123, 255, 0.00) 78.17%, rgba(134, 123, 255, 0.60) 100%), rgba(0, 0, 0, 0.10)',
            backgroundBlendMode: 'color-dodge, normal',
          }}
        />
        <img
          className="h-[195px] w-full rounded-[30px] object-cover object-center md:h-[442px]"
          alt="guests"
          src="/img/quiz/guests.png"
          draggable={false}
        />
      </div>
    </div>
  )
}

export default QuizPageQuestionGuests
