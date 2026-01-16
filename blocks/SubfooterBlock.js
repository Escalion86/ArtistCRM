'use client'

import React from 'react'
import DivContent from './components/DivContent'

const SubfooterBlock = () => (
  <DivContent
    noMargin
    className="flex h-[69px] flex-col items-start justify-center gap-y-[5px] md:items-center"
  >
    <a
      className="text-[11px] font-light leading-[135%] text-white duration-300 hover:text-[#FFCA45] md:text-[15px]"
      target="_blank"
      href="https://t.me/konstantin_belan"
    >
      <span className="text-[#A8A8CA]">Дизайн сайта:</span> Константин Белан
    </a>
    <a
      className="text-[11px] font-light leading-[135%] text-white duration-300 hover:text-[#FFCA45] md:text-[15px]"
      target="_blank"
      href="https://t.me/escalion"
    >
      <span className="text-[#A8A8CA]">Верстка сайта:</span> Алексей Белинский
    </a>
  </DivContent>
)

export default SubfooterBlock
