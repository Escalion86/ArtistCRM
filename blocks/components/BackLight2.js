import React from 'react'
import cn from 'classnames'

const BackLight2 = ({ className, opacity = 20 }) => (
  <div
    className={cn(
      'absolute z-30 h-[602px] w-[619px] rotate-[60deg]',
      opacity === 10 ? 'opacity-10' : '',
      opacity === 20 ? 'opacity-20' : '',
      opacity === 30 ? 'opacity-30' : '',
      opacity === 40 ? 'opacity-40' : '',
      opacity === 50 ? 'opacity-50' : '',
      opacity === 60 ? 'opacity-60' : '',
      opacity === 70 ? 'opacity-70' : '',
      opacity === 80 ? 'opacity-80' : '',
      opacity === 90 ? 'opacity-90' : '',
      opacity === 100 ? 'opacity-100' : '',
      className
    )}
  >
    <div className="relative h-[30px] w-full">
      <div
        className={cn(
          'absolute h-[412px] w-[260px] translate-x-[85px] translate-y-[36px] -rotate-[30deg] rounded-full opacity-60  blur-[88.75px] md:blur-[177.5px]'
        )}
        style={{
          background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        }}
      />
      <div
        className={cn(
          'absolute h-[332px] w-[209px] translate-x-[340px] translate-y-[238px] rotate-[30deg] rounded-full opacity-60 blur-[88.75px] md:blur-[177.5px]'
        )}
        style={{
          background:
            'linear-gradient(64deg, #773FCA 0%, #8E42FF 71.51%), linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        }}
      />
    </div>
  </div>
)

export default BackLight2
