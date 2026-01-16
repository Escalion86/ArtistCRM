import React from 'react'
import cn from 'classnames'

const QuizInfo = ({ className }) => {
  return (
    <div className={cn('text-[#A8A8CA]', className)}>
      Нажмите на{' '}
      <span
        className="min-h-[22px] min-w-[22px]"
        style={{
          display: 'inline-block',
          width: 22,
          height: 22,
          borderRadius: 660,
          opacity: '0.8',
          background:
            'linear-gradient(59deg, #4272D1 0%, #83ACFF 100%), linear-gradient(63deg, #692DC1 0%, #AC80EC 100%)',
        }}
      >
        <div
          style={{
            color: '#fff',
            display: 'flex',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          i
        </div>
      </span>
      , чтобы узнать подробнее о каждом направлении
    </div>
  )
}

export default QuizInfo
