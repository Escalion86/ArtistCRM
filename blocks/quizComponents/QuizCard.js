import React from 'react'
import cn from 'classnames'

const I = ({ onClick }) => (
  <div
    className="absolute right-[10px] top-[10px] hidden h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#4272D1] to-[#83ACFF] bg-size-200 bg-pos-0 text-[20px] text-white transition-all hover:via-[#83ACFF] hover:to-[#4272D1] hover:bg-pos-100 md:flex"
    style={{
      fontFamily: 'Montserrat',
      boxShadow:
        '3px 3px 8px 0px rgba(255, 255, 255, 0.25) inset, 0px 10px 25px 0px rgba(66, 114, 209, 0.55)',
    }}
    onClick={onClick}
  >
    i
  </div>
)

const QuizCard = ({ title, imageName, infoOpen, onChoose, big }) => (
  <div
    className={cn(
      'flex flex-col items-center rounded-[8px] px-[10px] pb-[10px] pt-[10px] md:rounded-[8px] md:px-[20px] md:pb-[25px] md:pt-[20px]',
      big
        ? 'h-[164px] w-[140px] md:h-[330px] md:w-[260px] tablet:w-[405px]'
        : 'h-[164px] w-[140px] md:h-[330px] md:w-[260px]'
    )}
    style={{
      background:
        'linear-gradient(341deg, rgba(96, 139, 246, 0.16) 0%, rgba(96, 139, 246, 0.00) 100%), #EDEDED',
      boxShadow:
        '3px 3px 25px 0px rgba(255, 255, 255, 0.03) inset, 0px 25px 36px 0px rgba(255, 255, 255, 0.20) inset',
    }}
  >
    <div className="relative w-full">
      <img
        className="h-[75px] w-full rounded-[5px] object-cover md:h-[167px] md:rounded-[10px]"
        alt={imageName}
        src={'/img/quiz/' + imageName + '.png'}
        draggable={false}
      />
      {infoOpen && <I onClick={infoOpen} />}
    </div>
    <div
      className="-mx-[16px] mb-[11px] mt-[11px] text-center text-[12px] font-medium text-[#0E0E1C] md:mb-[25px] md:mt-[20px] md:text-[19px]"
      // style={{
      //   fontFamily: 'Montserrat',
      // }}
    >
      {title}
    </div>
    <button
      onClick={onChoose}
      className="group flex h-[30px] w-full cursor-pointer select-none items-center justify-between gap-x-[12px] rounded-[7px] bg-gradient-to-r from-white to-white bg-size-200 bg-pos-0 px-[15px] transition-all duration-300 hover:from-[#692DC1] hover:to-[#AC80EC] hover:bg-pos-100 md:h-[45px] md:justify-center"
    >
      <span className="text-[11px] font-semibold text-[#0E0E1C] text-opacity-90 group-hover:text-white md:text-[17px]">
        Выбрать
      </span>
      <svg
        className="group-hover:hidden"
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="12"
        viewBox="0 0 17 12"
        fill="none"
      >
        <path
          opacity="0.3"
          d="M1.5 5.2C1.05817 5.2 0.7 5.55817 0.7 6C0.7 6.44183 1.05817 6.8 1.5 6.8V5.2ZM16.0657 6.56569C16.3781 6.25327 16.3781 5.74673 16.0657 5.43431L10.9745 0.343146C10.6621 0.0307264 10.1556 0.0307264 9.84315 0.343146C9.53073 0.655565 9.53073 1.1621 9.84315 1.47452L14.3686 6L9.84315 10.5255C9.53073 10.8379 9.53073 11.3444 9.84315 11.6569C10.1556 11.9693 10.6621 11.9693 10.9745 11.6569L16.0657 6.56569ZM1.5 6.8H15.5V5.2H1.5V6.8Z"
          fill="#0E0E1C"
        />
      </svg>
      <svg
        className="hidden group-hover:block"
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="12"
        viewBox="0 0 16 13"
        fill="none"
      >
        <path
          d="M1 5.7C0.558172 5.7 0.2 6.05817 0.2 6.5C0.2 6.94183 0.558172 7.3 1 7.3V5.7ZM15.5657 7.06569C15.8781 6.75327 15.8781 6.24673 15.5657 5.93431L10.4745 0.843146C10.1621 0.530726 9.65557 0.530726 9.34315 0.843146C9.03073 1.15557 9.03073 1.6621 9.34315 1.97452L13.8686 6.5L9.34315 11.0255C9.03073 11.3379 9.03073 11.8444 9.34315 12.1569C9.65557 12.4693 10.1621 12.4693 10.4745 12.1569L15.5657 7.06569ZM1 7.3H15V5.7H1V7.3Z"
          fill="white"
        />
      </svg>
    </button>
  </div>
)

export default QuizCard
