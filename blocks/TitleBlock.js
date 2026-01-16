import React from 'react'
import Content from './titleComponents/Content'
import Background from './titleComponents/Background'

const TitleBlock = () => {
  return (
    <div className="titleblock relative flex h-screen max-h-[800px] min-h-fit w-full min-w-[375px] flex-col items-center md:h-full md:min-h-screen tablet:max-h-none">
      <Background />
      <Content />
    </div>
  )
}

export default TitleBlock
