import React, { useEffect } from 'react'

var progress

const SvgProgressDynamyc = () => {
  useEffect(() => {
    progress = document.querySelector('.progress')
    setInterval(() => {
      if (progress.style.left === '0px') progress.style.left = '-18px'
      else progress.style.left = parseInt(progress.style.left) + 1 + 'px'
    }, 50)
  }, [])

  return (
    <svg
      style={{
        left: '-18px',
      }}
      className="progress absolute -z-10"
      width="1177"
      height="30"
      viewBox="0 0 1177 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g style={{ mixBlendMode: 'soft-light' }} opacity="0.3">
        <rect
          x="21.9084"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 21.9084 -42.8025)"
          fill="white"
        />
        <rect
          x="297.908"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 297.908 -42.8025)"
          fill="white"
        />
        <rect
          x="40.3723"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 40.3723 -42.8025)"
          fill="white"
        />
        <rect
          x="316.372"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 316.372 -42.8025)"
          fill="white"
        />
        <rect
          x="58.8362"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 58.8362 -42.8025)"
          fill="white"
        />
        <rect
          x="334.836"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 334.836 -42.8025)"
          fill="white"
        />
        <rect
          x="77.3"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 77.3 -42.8025)"
          fill="white"
        />
        <rect
          x="353.3"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 353.3 -42.8025)"
          fill="white"
        />
        <rect
          x="95.7639"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 95.7639 -42.8025)"
          fill="white"
        />
        <rect
          x="371.764"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 371.764 -42.8025)"
          fill="white"
        />
        <rect
          x="592.764"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 592.764 -42.8025)"
          fill="white"
        />
        <rect
          x="813.764"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 813.764 -42.8025)"
          fill="white"
        />
        <rect
          x="114.228"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 114.228 -42.8025)"
          fill="white"
        />
        <rect
          x="390.228"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 390.228 -42.8025)"
          fill="white"
        />
        <rect
          x="611.228"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 611.228 -42.8025)"
          fill="white"
        />
        <rect
          x="832.228"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 832.228 -42.8025)"
          fill="white"
        />
        <rect
          x="132.692"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 132.692 -42.8025)"
          fill="white"
        />
        <rect
          x="408.691"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 408.691 -42.8025)"
          fill="white"
        />
        <rect
          x="629.691"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 629.691 -42.8025)"
          fill="white"
        />
        <rect
          x="850.691"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 850.691 -42.8025)"
          fill="white"
        />
        <rect
          x="151.156"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 151.156 -42.8025)"
          fill="white"
        />
        <rect
          x="427.155"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 427.155 -42.8025)"
          fill="white"
        />
        <rect
          x="648.155"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 648.155 -42.8025)"
          fill="white"
        />
        <rect
          x="869.155"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 869.155 -42.8025)"
          fill="white"
        />
        <rect
          x="1035.16"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1035.16 -42.8025)"
          fill="white"
        />
        <rect
          x="169.619"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 169.619 -42.8025)"
          fill="white"
        />
        <rect
          x="445.619"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 445.619 -42.8025)"
          fill="white"
        />
        <rect
          x="666.619"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 666.619 -42.8025)"
          fill="white"
        />
        <rect
          x="887.619"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 887.619 -42.8025)"
          fill="white"
        />
        <rect
          x="1053.62"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1053.62 -42.8025)"
          fill="white"
        />
        <rect
          x="188.083"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 188.083 -42.8025)"
          fill="white"
        />
        <rect
          x="464.083"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 464.083 -42.8025)"
          fill="white"
        />
        <rect
          x="685.083"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 685.083 -42.8025)"
          fill="white"
        />
        <rect
          x="906.083"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 906.083 -42.8025)"
          fill="white"
        />
        <rect
          x="1072.08"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1072.08 -42.8025)"
          fill="white"
        />
        <rect
          x="206.547"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 206.547 -42.8025)"
          fill="white"
        />
        <rect
          x="482.547"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 482.547 -42.8025)"
          fill="white"
        />
        <rect
          x="703.547"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 703.547 -42.8025)"
          fill="white"
        />
        <rect
          x="924.547"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 924.547 -42.8025)"
          fill="white"
        />
        <rect
          x="1090.55"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1090.55 -42.8025)"
          fill="white"
        />
        <rect
          x="225.011"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 225.011 -42.8025)"
          fill="white"
        />
        <rect
          x="501.011"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 501.011 -42.8025)"
          fill="white"
        />
        <rect
          x="722.011"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 722.011 -42.8025)"
          fill="white"
        />
        <rect
          x="943.011"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 943.011 -42.8025)"
          fill="white"
        />
        <rect
          x="1109.01"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1109.01 -42.8025)"
          fill="white"
        />
        <rect
          x="243.475"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 243.475 -42.8025)"
          fill="white"
        />
        <rect
          x="519.475"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 519.475 -42.8025)"
          fill="white"
        />
        <rect
          x="740.475"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 740.475 -42.8025)"
          fill="white"
        />
        <rect
          x="961.475"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 961.475 -42.8025)"
          fill="white"
        />
        <rect
          x="1127.47"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1127.47 -42.8025)"
          fill="white"
        />
        <rect
          x="261.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 261.938 -42.8025)"
          fill="white"
        />
        <rect
          x="537.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 537.938 -42.8025)"
          fill="white"
        />
        <rect
          x="758.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 758.938 -42.8025)"
          fill="white"
        />
        <rect
          x="979.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 979.938 -42.8025)"
          fill="white"
        />
        <rect
          x="1145.94"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1145.94 -42.8025)"
          fill="white"
        />
        <rect
          x="279.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 279.938 -42.8025)"
          fill="white"
        />
        <rect
          x="555.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 555.938 -42.8025)"
          fill="white"
        />
        <rect
          x="776.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 776.938 -42.8025)"
          fill="white"
        />
        <rect
          x="997.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 997.938 -42.8025)"
          fill="white"
        />
        <rect
          x="1163.94"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1163.94 -42.8025)"
          fill="white"
        />
        <rect
          x="573.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 573.938 -42.8025)"
          fill="white"
        />
        <rect
          x="794.938"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 794.938 -42.8025)"
          fill="white"
        />
        <rect
          x="1015.94"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1015.94 -42.8025)"
          fill="white"
        />
        <rect
          x="1181.94"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1181.94 -42.8025)"
          fill="white"
        />
        <rect
          x="1200.39"
          y="-42.8025"
          width="10"
          height="115"
          transform="rotate(17.1489 1200.39 -42.8025)"
          fill="white"
        />
      </g>
    </svg>
  )
}

const QuizProgress = ({ progress }) => (
  <div className="h-[20px] w-full">
    <div
      className="relative h-[20px] rounded-[90px] only:w-full md:h-[30px]"
      style={{
        background:
          'linear-gradient(341deg, rgba(96, 139, 246, 0.16) 0%, rgba(96, 139, 246, 0.00) 100%), #EDEDED',
        boxShadow:
          '3px 3px 25px 0px rgba(255, 255, 255, 0.03) inset, 0px 25px 36px 0px rgba(255, 255, 255, 0.20) inset',
      }}
    >
      <div
        className="absolute left-0 z-10 flex h-full items-center justify-center overflow-hidden rounded-[90px] text-[12px] font-bold text-[#0E0E1C] duration-500 md:text-[17px]"
        style={{
          width: progress + '%',
          fontFamily: 'Montserrat',
          background:
            'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%), linear-gradient(63deg, #692DC1 0%, #AC80EC 100%), #C4C4C4',
        }}
      >
        <SvgProgressDynamyc />
        <div className="z-10">{progress}%</div>
      </div>
    </div>
  </div>
)

export default QuizProgress
