import React from 'react'
import cn from 'classnames'

const BackLight = ({ className, opacity = 20 }) => (
  <div
    className={cn(
      'absolute -z-10 h-[689px] w-[563px] rotate-[165deg]',
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
        className="absolute h-[509px] w-[320px] translate-x-[106px] translate-y-[46px] -rotate-[30deg] rounded-full opacity-60 blur-[77.5px] md:blur-[177.5px]"
        style={{
          background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        }}
      />
      <div
        className="absolute h-[410px] w-[258px] translate-x-[218px] translate-y-[240px] rotate-[30deg] rounded-full opacity-60 blur-[77.5px] md:blur-[177.5px]"
        style={{
          background:
            'linear-gradient(64deg, #773FCA 0%, #8E42FF 71.51%), linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
        }}
      />
    </div>
  </div>
)

export default BackLight
