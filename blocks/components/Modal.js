'use client'

import React from 'react'
import cn from 'classnames'

const Modal = ({ show, closeFunc, children }) => (
  <div
    className={cn(
      'fixed left-0 top-0 z-50 flex h-screen items-center justify-center overflow-hidden bg-black bg-opacity-80 transition-opacity duration-500',
      show ? 'w-full opacity-100' : 'w-0 opacity-0'
    )}
    onClick={closeFunc}
  >
    <div
      className="relative mx-[18px] flex max-w-[620px] flex-col items-center overflow-hidden rounded-[30px] bg-white px-[18px] pb-[40px] pt-[60px] md:max-w-[640px] md:px-[65px] md:pb-[60px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="group absolute right-[16px] top-[16px] z-30 flex h-[28px] w-[28px] cursor-pointer items-center justify-center md:right-[29px] md:top-[24px]"
        onClick={closeFunc}
      >
        <svg
          className="duration-300 group-hover:scale-125"
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="20"
          viewBox="0 0 19 20"
          fill="none"
        >
          <g>
            <path
              d="M0 19.6L6.84 9.84L0.16 0H4.2L9.12 7.76L13.64 0H17.84L11.4 9.52L18.08 19.6H14.04L9.08 11.88L4.04 19.6H0Z"
              fill="black"
            />
          </g>
        </svg>
      </div>
      {children}
    </div>
  </div>
)

export default Modal
