import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { useState } from 'react'

const MagicanImage = () => {
  const [isCardReveal, setIsCardRevial] = useState(false)
  return (
    <div className="absolute bottom-0 left-[min(calc(40%),calc(12%+260px))] top-[70px] z-10 flex max-h-full w-[96%] justify-center phoneH:left-[37%] sm:bottom-auto sm:h-full sm:w-[max(300px,97%)] tablet:left-[calc(12%+260px)] tablet:max-h-[1035px]">
      <div className="relative z-10 h-full">
        <div className="relative mt-20 aspect-[996/1035] h-[55%] w-full sm:mt-0 sm:h-[90%] md:mt-12 md:h-[95%] tablet:h-full">
          <Image
            className="object-contain"
            alt="foto"
            src="/img/magican_with_card_back.png"
            // draggable={false}
            fill
          />
          <div
            onClick={() => setIsCardRevial(true)}
            className="absolute left-[40%] top-[48%] z-20 h-[10.8%] w-[8.3%] cursor-pointer"
          />
          {/* <motion.div
            className="absolute w-full h-full"
            transition={{ duration: 1, delay: 0.3 }}
            animate={{ opacity: isCardReveal ? 1 : 1 }}
          >
            <Image
              className="absolute w-full h-full"
              alt="foto"
              src="/img/card_back.png"
              // draggable={false}
              fill
            />
          </motion.div> */}
          <motion.div
            className="absolute w-full h-full"
            transition={{ duration: 1, delay: 0.3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isCardReveal ? 1 : 0 }}
          >
            <Image
              // className="absolute w-full h-full"
              alt="foto"
              src="/img/queen_of_hearts.png"
              // draggable={false}
              fill
            />
          </motion.div>
        </div>
        <div
          className="absolute left-[35%] top-[60%] -z-10 aspect-[4/6] w-[43%] -translate-y-1/2 -rotate-[30deg] rounded-full opacity-60"
          style={{
            background: 'linear-gradient(63deg, #4272D1 0%, #83ACFF 100%)',
            boxShadow: '6px 6px 26px 0px rgba(255, 255, 255, 0.35) inset',
            filter: 'blur(137.5px)',
          }}
        />
        <motion.div
          className="laptop:right-[20%] absolute right-[38%] top-[48%] z-20 w-[130px] rounded-[20px] sm:right-[40%] sm:top-[56%] sm:w-[240px] md:top-[65%] tablet:right-[39%] tablet:top-[65%] xl:w-[290px]"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background:
              'linear-gradient(343deg, rgba(200, 139, 246, 0.80) 0%, rgba(96, 139, 246, 0.00) 83.72%), linear-gradient(63deg, rgba(11, 11, 21, 0.70) 0%, rgba(26, 26, 50, 0.70) 100%)',
            backgroundBlendMode: 'color-dodge, normal',
            boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
            backdropFilter: 'blur(3px)',
          }}
          transition={{ duration: 1 }}
          animate={{ opacity: isCardReveal ? 0 : 1 }}
        >
          <div className="relative px-[8px] py-[6px] sm:px-[16px] sm:py-[12px] xl:px-[15px] xl:py-[12px]">
            <div className="text-[7px] font-normal leading-[125%] text-white sm:text-[12.8px] xl:text-[16px]">
              Подумай о карте и нажми на неё...
            </div>
            <svg
              className="absolute -right-[12px] -top-[40px] w-[50px] -scale-y-100 sm:-top-[64px] sm:right-0 sm:w-[74px] md:-top-[72px] md:w-[84px] tablet:-top-[74px] tablet:right-[20px] tablet:w-[92px]"
              xmlns="http://www.w3.org/2000/svg"
              // width="100"
              // height="64"
              viewBox="0 0 64 46"
              fill="none"
            >
              <path
                // opacity="0.8"
                d="M0.309221 41.5894C0.11396 41.7846 0.113961 42.1012 0.309221 42.2965L3.4912 45.4785C3.68647 45.6737 4.00305 45.6737 4.19831 45.4785C4.39357 45.2832 4.39357 44.9666 4.19831 44.7714L1.36988 41.9429L4.19831 39.1145C4.39357 38.9192 4.39357 38.6027 4.19831 38.4074C4.00304 38.2121 3.68646 38.2121 3.4912 38.4074L0.309221 41.5894ZM48.4574 0.998232C48.9662 1.04135 49.4612 1.09543 49.9425 1.16005L50.0756 0.168937C49.5776 0.102086 49.0663 0.0462521 48.5418 0.00180331L48.4574 0.998232ZM52.8046 1.70529C53.7953 1.95586 54.7101 2.25883 55.5493 2.60834L55.9338 1.6852C55.0459 1.31543 54.0843 0.997456 53.0498 0.73582L52.8046 1.70529ZM58.1048 3.96266C58.9391 4.52033 59.6567 5.14006 60.2593 5.81097L61.0032 5.14276C60.3412 4.40568 59.5593 3.73208 58.6605 3.13129L58.1048 3.96266ZM61.8167 8.16028C62.2107 9.01183 62.4696 9.91776 62.592 10.8666L63.5837 10.7387C63.4487 9.69145 63.1621 8.68682 62.7243 7.74042L61.8167 8.16028ZM62.5667 13.7003C62.4419 14.6066 62.2078 15.5396 61.8621 16.4905L62.8019 16.8322C63.1698 15.8202 63.4221 14.8185 63.5573 13.8368L62.5667 13.7003ZM60.6496 19.1049C60.1936 19.9144 59.6596 20.7299 59.0467 21.5458L59.8462 22.1464C60.4837 21.2978 61.0421 20.4458 61.5209 19.5956L60.6496 19.1049ZM57.1587 23.7894C56.5177 24.4756 55.8201 25.1583 55.0654 25.834L55.7325 26.579C56.5083 25.8843 57.2273 25.1809 57.8895 24.472L57.1587 23.7894ZM52.8016 27.7067C52.046 28.2856 51.2465 28.8567 50.4028 29.4178L50.9565 30.2505C51.8182 29.6775 52.6359 29.0934 53.4097 28.5005L52.8016 27.7067ZM47.8945 30.9787C47.0634 31.4628 46.1968 31.9372 45.2945 32.4003L45.7511 33.29C46.6688 32.819 47.551 32.3361 48.3979 31.8427L47.8945 30.9787ZM42.6449 33.6794C41.7707 34.0762 40.8674 34.4626 39.935 34.8373L40.3079 35.7652C41.2537 35.3851 42.1704 34.993 43.0582 34.59L42.6449 33.6794ZM37.1683 35.8836C36.253 36.2089 35.3127 36.5233 34.3472 36.8258L34.6462 37.7801C35.6235 37.4739 36.5758 37.1555 37.5032 36.8259L37.1683 35.8836ZM31.5084 37.6604C30.5774 37.9166 29.6252 38.1621 28.6518 38.3962L28.8855 39.3685C29.8694 39.1319 30.8321 38.8837 31.7738 38.6245L31.5084 37.6604ZM25.7468 39.0466C24.7959 39.2443 23.8264 39.4312 22.8381 39.6069L23.0131 40.5915C24.0108 40.4141 24.9899 40.2253 25.9503 40.0257L25.7468 39.0466ZM19.9215 40.084C18.949 40.2296 17.9596 40.3645 16.9533 40.4882L17.0753 41.4807C18.0902 41.3559 19.0883 41.2198 20.0696 41.073L19.9215 40.084ZM14.034 40.8106C13.0584 40.9064 12.0678 40.9919 11.0622 41.0668L11.1364 42.064C12.1497 41.9886 13.1482 41.9024 14.1317 41.8058L14.034 40.8106ZM8.11168 41.253C7.13466 41.3038 6.14426 41.3447 5.14045 41.3753L5.17097 42.3749C6.18185 42.344 7.1794 42.3028 8.16362 42.2516L8.11168 41.253ZM2.17437 41.4353C1.67368 41.4404 1.16982 41.4429 0.662776 41.4429L0.662774 42.4429C1.17316 42.4429 1.68039 42.4404 2.18445 42.4353L2.17437 41.4353Z"
                fill="white"
              />
            </svg>
          </div>
        </motion.div>
        {isCardReveal && (
          <motion.div
            className="laptop:right-[20%] absolute right-[38%] top-[48%] z-20 w-[120px] rounded-[20px] sm:right-[40%] sm:top-[56%] sm:w-[220px] md:top-[65%] tablet:right-[39%] tablet:top-[65%] xl:w-[270px]"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.05)',
              background:
                'linear-gradient(343deg, rgba(200, 139, 246, 0.80) 0%, rgba(96, 139, 246, 0.00) 83.72%), linear-gradient(63deg, rgba(11, 11, 21, 0.70) 0%, rgba(26, 26, 50, 0.70) 100%)',
              backgroundBlendMode: 'color-dodge, normal',
              boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
              backdropFilter: 'blur(3px)',
            }}
            transition={{ duration: 1, delay: 2 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isCardReveal ? 1 : 0 }}
          >
            <Link href="/#focus">
              <div className="relative flex justify-center gap-x-1 px-[8px] py-[6px] sm:gap-x-2 sm:px-[16px] sm:py-[12px] xl:px-[15px] xl:py-[12px]">
                <div className="text-[7px] font-normal leading-[125%] text-white sm:text-[12.8px] xl:text-[16px]">
                  Угадал?
                </div>
                <motion.div
                  transition={{ duration: 1, delay: 4.5 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isCardReveal ? 1 : 0 }}
                  className="whitespace-nowrap text-[7px] font-normal leading-[125%] text-white sm:text-[12.8px] xl:text-[16px]"
                >
                  Если нет, ЖМИ СЮДА
                </motion.div>
              </div>
            </Link>
          </motion.div>
        )}

        <div
          className="laptop:right-[20%] absolute right-[38%] top-[62%] z-20 w-[140px] rounded-[7px] sm:top-[75%] sm:w-[264px] tablet:right-[36%] xl:w-[330px]"
          // className="laptop:right-[20%] absolute right-[40%] top-[60%] z-20 w-[140px] rounded-[7px] sm:top-[65%] sm:w-[264px] tablet:right-[36%] xl:w-[330px]"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background:
              'linear-gradient(343deg, rgba(96, 139, 246, 0.30) 0%, rgba(96, 139, 246, 0.00) 83.72%), linear-gradient(63deg, rgba(11, 11, 21, 0.70) 0%, rgba(26, 26, 50, 0.70) 100%)',
            backgroundBlendMode: 'color-dodge, normal',
            boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div className="relative pb-[8px] pl-[12px] pr-[20px] pt-[6px] sm:pb-[18.4px] sm:pl-[32px] sm:pr-[50px] sm:pt-[17px] xl:pb-[23px] xl:pl-[40px] xl:pr-[60px] xl:pt-[21px]">
            <div
              className="absolute right-[5px] top-[5px] h-[4.5px] w-[4.5px] rounded-[100px] sm:right-[12px] sm:top-[12px] sm:h-[11.2px] sm:w-[11.2px] xl:right-[15px] xl:top-[15px] xl:h-[15px] xl:w-[15px]"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(255, 255, 255, 0.04)',
                boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
              }}
            />
            <div className="text-[9px] font-semibold leading-[135%] text-white sm:text-[19.2px] xl:text-[24px]">
              Алексей Белинский
            </div>
            <div className="text-[7px] font-normal leading-[125%] text-[#A8A8CA] sm:text-[12.8px] xl:text-[16px]">
              Иллюзионист с опытом 20 лет, снимается на телеканале ТНТ
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MagicanImage
