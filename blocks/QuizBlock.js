'use client'

import React from 'react'
import DivContent from './components/DivContent'
import DivText from './components/DivText'
import SpanGradientTitle from './components/SpanGradientTitle'
import Quiz from './quizComponents/Quiz'
import cn from 'classnames'

const Title = ({ className }) => (
  <div
    className={cn(
      'w-[240px] text-center font-buyan text-[29px] font-bold leading-[100%] text-white phoneH:w-[260px] phoneH:text-[32px] sm:w-[320px] sm:text-[36px] md:w-[340px] md:text-[42px] tablet:w-[520px] tablet:text-[64px]',
      className
    )}
  >
    <SpanGradientTitle>Пройдите квиз</SpanGradientTitle>, чтобы сделать
    идеальное шоу
  </div>
)

const QuizBlock = () => {
  return (
    <div className="relative flex w-full justify-center">
      <div className="flex w-full flex-col items-center">
        <DivContent
          noMargin
          fullWidth={false}
          className="mt-[69px] flex flex-col items-center sm:mt-[100px] md:mt-[153px] xl:mt-[230px]"
        >
          <div className="flex w-full flex-col items-center justify-center sm:flex-row">
            <img
              className=" -mb-[2px] -mr-[5px] -mt-[4px] w-[50px] object-contain sm:-mb-[15px] sm:-mt-[5px] sm:w-[60px] md:-mb-[15px] md:-mt-[5px]  md:w-[80px] tablet:-mb-[17px] tablet:-mt-[6px] tablet:w-[107px]"
              alt="star"
              src="/img/star.png"
              draggable={false}
            />
            <Title />
            <img
              className="-mb-[12px] -mr-[5px] -mt-[4px] hidden w-[50px] -scale-x-100 object-contain sm:-mb-[15px] sm:-mt-[5px] sm:block sm:w-[60px]  md:-mb-[15px] md:-mt-[5px]  md:w-[80px] tablet:-mb-[17px] tablet:-mt-[6px] tablet:w-[107px]"
              alt="star"
              src="/img/star.png"
              draggable={false}
            />
          </div>
          <DivText className="mt-[18px] max-w-[320px] text-center sm:max-w-[340px] md:max-w-[460px] tablet:mt-[35px] tablet:max-w-[600px]">
            Этот тест поможет сделать представление именно под ваш праздник.{' '}
            <span
              style={{
                color: '#A8A8CA',
              }}
            >
              Не волнуйтесь, он проходится за 30 секунд.
            </span>
          </DivText>
        </DivContent>
        <Quiz />
      </div>
      <div
        className="absolute right-0 top-[75px] z-10 hidden aspect-[235/303] h-[265px] w-[207px] xl:block 2xl:h-[303px] 2xl:w-[235px]"
        style={{
          // width: 289,
          // height: '28%',
          flexShrink: 0,
          background: 'url("/img/hand2.png")',
          mixBlendMode: 'hard-light',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  )
}

export default QuizBlock
