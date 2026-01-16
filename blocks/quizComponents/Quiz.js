'use client'

import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import { useSetAtom } from 'jotai'
import QuizProgress from './QuizProgress'
import QuizPageFinal from './QuizPageFinal'
import QuizPageQuestionGuests from './QuizPageQuestionGuests'
import QuizPageQuestionAges from './QuizPageQuestionAges'
import QuizPageQuestionType from './QuizPageQuestionType'
import QuizInfo from './QuizInfo'
import showModalZakazAtom from '@state/atoms/showModalZakazAtom'
import { postData } from '@helpers/CRUD'
import yandexAimAtom from '@state/atoms/yandexAimAtom'
import { reachGoal } from 'app/components/metrika'

var quiz

const QuizBackground = () => (
  <div className="absolute flex h-full w-full bg-white md:rounded-[30px] md:bg-transparent">
    <div
      className="hidden flex-1 rounded-l-[30px] rounded-r-[30px] md:block xl:rounded-r-none"
      style={{
        backgroundImage:
          'radial-gradient(48px at -20px 50%, transparent 48px, #fff 49px)',
        // backgroundImage:
        //   'radial-gradient(circle at 0% 0%, transparent, 30% 30%)',
      }}
    />
    <div
      className="hidden flex-1 rounded-r-[30px] xl:block"
      style={{
        backgroundImage:
          'radial-gradient(48px 48px at calc(100% + 20px) 50%, transparent 48px, #fff 49px)',
      }}
    />
  </div>
)

const QuizHeader = () => (
  <div
    className="flex h-[102px] justify-center rounded-[10px] px-[30px] py-[20px] sm:h-[87px] md:rounded-[18px] md:px-[50px]"
    style={{
      border: '1px solid rgba(14, 14, 28, 0.05)',
      background:
        'linear-gradient(343deg, rgba(96, 139, 246, 0.20) 0%, rgba(96, 139, 246, 0.00) 83.72%), linear-gradient(63deg, #0B0B15 0%, #1A1A32 100%)',
      backgroundBlendMode: 'color-dodge, normal',
      boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
      backdropFilter: 'blur(3px)',
    }}
  >
    <div className="flex w-full flex-col justify-between gap-x-[12px] sm:flex-row sm:items-center">
      <div className="whitespace-nowrap text-[13px] font-medium leading-[135%] text-white md:text-[16px] tablet:text-[19px]">
        В конце теста вас ждет <span className="md:font-bold">подарок</span>:
      </div>
      <svg
        className="hidden h-[14px] w-[120px] tablet:block tablet:w-[131px] xl:w-[173px]"
        xmlns="http://www.w3.org/2000/svg"
        // width="175"
        // height="17"
        viewBox="0 0 175 17"
        fill="none"
      >
        <path
          opacity="0.6"
          d="M173.825 12.6759C174.198 12.4964 174.355 12.0483 174.176 11.675L171.251 5.59174C171.071 5.21844 170.623 5.06133 170.25 5.24083C169.877 5.42034 169.719 5.86847 169.899 6.24177L172.499 11.6491L167.092 14.2492C166.718 14.4287 166.561 14.8769 166.741 15.2502C166.92 15.6235 167.368 15.7806 167.742 15.6011L173.825 12.6759ZM0.290503 12.7202C0.790297 12.8656 1.28816 13.0058 1.78416 13.1411L2.17885 11.694C1.691 11.5609 1.20123 11.4229 0.709497 11.2799L0.290503 12.7202ZM4.73812 13.8935C5.74502 14.1318 6.74444 14.3497 7.73688 14.548L8.03088 13.0771C7.05566 12.8822 6.07338 12.6681 5.08353 12.4338L4.73812 13.8935ZM10.7295 15.0913C11.7496 15.2578 12.7627 15.4041 13.7692 15.5312L13.9571 14.043C12.9684 13.9182 11.9733 13.7745 10.9711 13.6109L10.7295 15.0913ZM16.8082 15.8594C17.8285 15.951 18.8425 16.0234 19.8509 16.0778L19.9317 14.58C18.9409 14.5265 17.9446 14.4554 16.9423 14.3654L16.8082 15.8594ZM22.915 16.189C23.9381 16.2083 24.9558 16.2097 25.9688 16.1945L25.9463 14.6947C24.9498 14.7096 23.949 14.7082 22.9432 14.6893L22.915 16.189ZM29.0215 16.0991C30.0426 16.0509 31.0594 15.9867 32.0727 15.9078L31.9563 14.4124C30.9577 14.4901 29.956 14.5533 28.9507 14.6008L29.0215 16.0991ZM35.1112 15.6278C36.1239 15.5202 37.1336 15.3991 38.1412 15.2658L37.9444 13.7788C36.949 13.9105 35.952 14.03 34.9528 14.1361L35.1112 15.6278ZM41.1588 14.8303C42.162 14.6739 43.1637 14.5066 44.1646 14.3297L43.9035 12.8526C42.9119 13.0279 41.9202 13.1935 40.9278 13.3482L41.1588 14.8303ZM47.1599 13.7723C48.153 13.5787 49.1462 13.3769 50.14 13.1681L49.8315 11.7002C48.8442 11.9076 47.8582 12.108 46.8729 12.3L47.1599 13.7723ZM53.1132 12.5244C54.0999 12.3049 55.088 12.0797 56.0782 11.8501L55.7394 10.3889C54.7529 10.6176 53.7692 10.8418 52.7875 11.0601L53.1132 12.5244ZM59.0308 11.1552C60.0124 10.9212 60.9967 10.684 61.9843 10.4448L61.6312 8.98695C60.6447 9.22586 59.6622 9.4626 58.683 9.69606L59.0308 11.1552ZM64.9318 9.72878C65.9085 9.49119 66.889 9.25281 67.8742 9.01465L67.5217 7.55665C66.5354 7.79508 65.554 8.03369 64.5772 8.27128L64.9318 9.72878ZM70.8259 8.30629C71.8018 8.07421 72.7826 7.84343 73.769 7.61496L73.4305 6.15365C72.4408 6.38289 71.4571 6.61436 70.4789 6.84699L70.8259 8.30629ZM76.719 6.94342C77.7004 6.72425 78.6877 6.50831 79.6816 6.29657L79.369 4.8295C78.3699 5.04236 77.3778 5.25935 76.3921 5.47948L76.719 6.94342ZM82.6335 5.68486C83.6176 5.48695 84.6084 5.29397 85.6065 5.10681L85.33 3.6325C84.3251 3.82095 83.3278 4.01519 82.3378 4.2143L82.6335 5.68486ZM88.5762 4.57178C89.5615 4.40172 90.5543 4.23802 91.5549 4.0815L91.3231 2.59952C90.3143 2.75731 89.3138 2.9223 88.3211 3.09363L88.5762 4.57178ZM94.5495 3.6387C95.5358 3.50143 96.5301 3.37171 97.5327 3.25028L97.3524 1.76116C96.3407 1.88369 95.3376 2.01457 94.3427 2.15301L94.5495 3.6387ZM100.549 2.91341C101.536 2.81253 102.532 2.72014 103.536 2.63693L103.412 1.14205C102.398 1.22607 101.393 1.31934 100.396 1.42118L100.549 2.91341ZM106.557 2.41672C107.549 2.35435 108.549 2.30128 109.559 2.25815L109.495 0.759515C108.475 0.803087 107.465 0.856689 106.463 0.919676L106.557 2.41672ZM112.582 2.15987C113.576 2.13775 114.579 2.12552 115.591 2.12376L115.588 0.62376C114.566 0.625543 113.553 0.637899 112.548 0.660245L112.582 2.15987ZM118.613 2.14966C119.607 2.16843 120.61 2.19748 121.622 2.23732L121.681 0.73848C120.659 0.698234 119.646 0.66889 118.641 0.649928L118.613 2.14966ZM124.642 2.38721C125.633 2.44652 126.633 2.51631 127.642 2.59702L127.762 1.1018C126.743 1.02028 125.733 0.949799 124.732 0.889888L124.642 2.38721ZM130.662 2.86908C131.647 2.96772 132.64 3.07686 133.643 3.19689L133.821 1.70753C132.809 1.58635 131.806 1.47615 130.811 1.37654L130.662 2.86908ZM136.665 3.58852C137.641 3.72458 138.625 3.871 139.618 4.02814L139.852 2.54658C138.851 2.388 137.857 2.24022 136.872 2.10288L136.665 3.58852ZM142.622 4.53207C143.595 4.70449 144.576 4.8872 145.565 5.08051L145.853 3.60836C144.855 3.41336 143.865 3.22904 142.883 3.05508L142.622 4.53207ZM148.53 5.68675C149.507 5.89525 150.491 6.11407 151.484 6.3435L151.822 4.88202C150.821 4.65071 149.828 4.43007 148.843 4.2198L148.53 5.68675ZM154.402 7.04281C155.382 7.28612 156.37 7.53972 157.367 7.80388L157.751 6.35401C156.747 6.08781 155.751 5.83222 154.763 5.58698L154.402 7.04281ZM160.243 8.59013C161.205 8.86078 162.174 9.14123 163.151 9.43169L163.578 7.99394C162.595 7.70138 161.618 7.41888 160.649 7.14621L160.243 8.59013ZM166.062 10.3204C167.003 10.6152 167.951 10.9192 168.906 11.2327L169.374 9.80749C168.412 9.49191 167.458 9.18579 166.51 8.88895L166.062 10.3204ZM171.793 12.2017C172.277 12.368 172.764 12.5366 173.252 12.7078L173.748 11.2922C173.257 11.12 172.767 10.9502 172.28 10.7829L171.793 12.2017Z"
          fill="#A8A8CA"
        />
      </svg>
      <div className="flex flex-col gap-x-[47px] text-[12px] font-normal text-[#A8A8CA] md:text-[16px] tablet:text-[19px] 2xl:flex-row">
        <div className="flex items-center gap-x-[8px] md:gap-x-[15px]">
          <div
            className="-mt-[4px] h-[8px] w-[8px] rounded-[100px] md:h-[14px] md:w-[14px]"
            style={{
              border: '1px solid rgba(14, 14, 28, 0.05)',
              background:
                'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%), rgba(14, 14, 28, 0.04)',
              boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
            }}
          />
          <div className="whitespace-nowrap">
            Бесплатная{' '}
            <span className="font-medium text-white">консультация</span>
          </div>
        </div>
        <div className="flex items-center gap-x-[8px] md:gap-x-[15px]">
          <div
            className="-mt-[4px] h-[8px] w-[8px] rounded-[100px] md:h-[14px] md:w-[14px]"
            style={{
              border: '1px solid rgba(14, 14, 28, 0.05)',
              background:
                'linear-gradient(67deg, #C17C0E 0%, #FFCA45 63.68%), rgba(14, 14, 28, 0.04)',
              boxShadow: '6px 6px 30px 0px rgba(255, 255, 255, 0.05) inset',
            }}
          />
          <div className="whitespace-nowrap">
            Доп.{' '}
            <span className="font-medium text-white">индивидуальный номер</span>
            {/* <br />с вашей фотографией или логотипом компании */}
          </div>
        </div>
      </div>
      <svg
        className="absolute left-[calc(50%+64px)] top-[30px] sm:hidden"
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="46"
        viewBox="0 0 64 46"
        fill="none"
      >
        <path
          opacity="0.6"
          d="M0.309221 41.5894C0.11396 41.7846 0.113961 42.1012 0.309221 42.2965L3.4912 45.4785C3.68647 45.6737 4.00305 45.6737 4.19831 45.4785C4.39357 45.2832 4.39357 44.9666 4.19831 44.7714L1.36988 41.9429L4.19831 39.1145C4.39357 38.9192 4.39357 38.6027 4.19831 38.4074C4.00304 38.2121 3.68646 38.2121 3.4912 38.4074L0.309221 41.5894ZM48.4574 0.998232C48.9662 1.04135 49.4612 1.09543 49.9425 1.16005L50.0756 0.168937C49.5776 0.102086 49.0663 0.0462521 48.5418 0.00180331L48.4574 0.998232ZM52.8046 1.70529C53.7953 1.95586 54.7101 2.25883 55.5493 2.60834L55.9338 1.6852C55.0459 1.31543 54.0843 0.997456 53.0498 0.73582L52.8046 1.70529ZM58.1048 3.96266C58.9391 4.52033 59.6567 5.14006 60.2593 5.81097L61.0032 5.14276C60.3412 4.40568 59.5593 3.73208 58.6605 3.13129L58.1048 3.96266ZM61.8167 8.16028C62.2107 9.01183 62.4696 9.91776 62.592 10.8666L63.5837 10.7387C63.4487 9.69145 63.1621 8.68682 62.7243 7.74042L61.8167 8.16028ZM62.5667 13.7003C62.4419 14.6066 62.2078 15.5396 61.8621 16.4905L62.8019 16.8322C63.1698 15.8202 63.4221 14.8185 63.5573 13.8368L62.5667 13.7003ZM60.6496 19.1049C60.1936 19.9144 59.6596 20.7299 59.0467 21.5458L59.8462 22.1464C60.4837 21.2978 61.0421 20.4458 61.5209 19.5956L60.6496 19.1049ZM57.1587 23.7894C56.5177 24.4756 55.8201 25.1583 55.0654 25.834L55.7325 26.579C56.5083 25.8843 57.2273 25.1809 57.8895 24.472L57.1587 23.7894ZM52.8016 27.7067C52.046 28.2856 51.2465 28.8567 50.4028 29.4178L50.9565 30.2505C51.8182 29.6775 52.6359 29.0934 53.4097 28.5005L52.8016 27.7067ZM47.8945 30.9787C47.0634 31.4628 46.1968 31.9372 45.2945 32.4003L45.7511 33.29C46.6688 32.819 47.551 32.3361 48.3979 31.8427L47.8945 30.9787ZM42.6449 33.6794C41.7707 34.0762 40.8674 34.4626 39.935 34.8373L40.3079 35.7652C41.2537 35.3851 42.1704 34.993 43.0582 34.59L42.6449 33.6794ZM37.1683 35.8836C36.253 36.2089 35.3127 36.5233 34.3472 36.8258L34.6462 37.7801C35.6235 37.4739 36.5758 37.1555 37.5032 36.8259L37.1683 35.8836ZM31.5084 37.6604C30.5774 37.9166 29.6252 38.1621 28.6518 38.3962L28.8855 39.3685C29.8694 39.1319 30.8321 38.8837 31.7738 38.6245L31.5084 37.6604ZM25.7468 39.0466C24.7959 39.2443 23.8264 39.4312 22.8381 39.6069L23.0131 40.5915C24.0108 40.4141 24.9899 40.2253 25.9503 40.0257L25.7468 39.0466ZM19.9215 40.084C18.949 40.2296 17.9596 40.3645 16.9533 40.4882L17.0753 41.4807C18.0902 41.3559 19.0883 41.2198 20.0696 41.073L19.9215 40.084ZM14.034 40.8106C13.0584 40.9064 12.0678 40.9919 11.0622 41.0668L11.1364 42.064C12.1497 41.9886 13.1482 41.9024 14.1317 41.8058L14.034 40.8106ZM8.11168 41.253C7.13466 41.3038 6.14426 41.3447 5.14045 41.3753L5.17097 42.3749C6.18185 42.344 7.1794 42.3028 8.16362 42.2516L8.11168 41.253ZM2.17437 41.4353C1.67368 41.4404 1.16982 41.4429 0.662776 41.4429L0.662774 42.4429C1.17316 42.4429 1.68039 42.4404 2.18445 42.4353L2.17437 41.4353Z"
          fill="#A8A8CA"
        />
      </svg>
    </div>
  </div>
)

const answers = [
  'Что у вас за мероприятие?',
  'Какого возраста будут гости?',
  'Сколько будет зрителей?',
  // 'Когда планируется мероприятие?',
  // 'Укажите город',
]

const Quiz = () => {
  const setShowModalZakaz = useSetAtom(showModalZakazAtom)
  const setYandexAim = useSetAtom(yandexAimAtom)
  const [isQuizSended, setIsQuizSended] = useState(false)
  // const { reachGoal } = useMetrica()

  const [quizAnswers, setQuizAnswers] = useState(
    new Array(answers.length).fill(null)
  )
  // type, ages, guestsNum, dateTime, address

  const [quizQuestionNum, setQuizQuestionNum] = useState(0)

  const nextQuestion = () => {
    if (quizQuestionNum >= quizAnswers.length) return
    setQuizQuestionNum((state) => state + 1)
  }

  const answerToQuestion = (newAnswer) => {
    setQuizAnswers((state) =>
      state.map((answer, index) =>
        index === quizQuestionNum ? newAnswer : answer
      )
    )
    nextQuestion()
    if (typeof window !== 'undefined') {
      const yOffset = 70
      const y = quiz.getBoundingClientRect().top + window.pageYOffset + yOffset

      window.scrollTo({ top: y, behavior: 'smooth' })
    }
    // quiz.scrollIntoView({
    //   behavior: 'smooth',
    //   block: 'start',
    //   inline: 'nearest',
    // })
  }

  useEffect(() => {
    quiz = document.querySelector('.quiz')
    // bodyRect = document.body.getBoundingClientRect(),
    // quizRect = quiz.getBoundingClientRect(),
    // offsetQuiz = quizRect.top - bodyRect.top
  }, [])

  const onSubmit = async (phone, contact) => {
    if (phone == 79874565544) return
    setYandexAim(null)

    setIsQuizSended('inProcess')
    await postData(
      `/api/requests`,
      {
        source: 'Квиз',
        contact,
        // name,
        audience: quizAnswers[1],
        type: quizAnswers[0],
        // customType,
        // date,
        spectators: quizAnswers[2],
        // town,
        // address,
        phone,
        // official,
        // comment,
        yandexAim: 'form_test',
      },
      (data) => {
        setIsQuizSended(true)
        setShowModalZakaz('success')
      },
      (error) => {
        setIsQuizSended(false)
        setShowModalZakaz('unsuccess')
      }
      // (data) => {
      //   snackbar.success(messages[itemName]?.add?.success)
      //   if (props['set' + capitalizeFirstLetter(itemName)])
      //     props['set' + capitalizeFirstLetter(itemName)](data)
      //   // setEvent(data)
      // },
      // (error) => {
      //   snackbar.error(messages[itemName]?.add?.error)
      //   setErrorCard(itemName + item._id)
      //   const data = {
      //     errorPlace: 'CREATE ERROR',
      //     itemName,
      //     item,
      //     error,
      //   }
      //   addErrorModal(data)
      //   console.log(data)
      // }
    )
    return reachGoal('form_test')
  }

  const handleEnterKeyDown = (event, phone, contact) => {
    if (event.key === 'Enter') {
      onSubmit(phone, contact)
    }
  }

  // console.log('quiz?.scrollTop :>> ', quiz?.y)
  // const progress =
  //   (Object.keys(quizAnswers).reduce(
  //     (previous, key) => previous + (quizAnswers[key] ? 1 : 0),
  //     0
  //   ) /
  //     Object.keys(quizAnswers).length) *
  //   100
  const progress = Math.floor((quizQuestionNum / quizAnswers.length) * 100)

  return (
    <div className="quiz z-10 mb-[40px] flex w-full justify-center px-[18px] md:mb-[0px] md:px-[52px] tablet:mb-[130px]">
      <div className="md:[mt-60px] relative mt-[30px] w-full min-w-[320px] max-w-full overflow-hidden rounded-[18px] xl:max-w-[1360px]">
        <QuizBackground />
        <div className="relative z-10 flex max-w-full flex-col gap-y-[30px] overflow-hidden px-[10px] pb-[25px] pt-[10px] md:gap-y-[40px] md:px-[40px] md:pb-[50px] md:pt-[40px] xl:gap-y-[57px] xl:px-[100px]">
          <QuizHeader />
          <div
            className={cn(
              'px-[10px] md:px-0',
              quizQuestionNum === answers.length ? 'hidden' : ''
            )}
          >
            <div className="relative z-10 text-[18px] font-bold md:text-[36px]">
              <span
                style={{
                  color: 'rgba(14, 14, 28, 0.50)',
                }}
              >
                {quizQuestionNum + 1}/{quizAnswers.length}.
              </span>{' '}
              <span
                style={{
                  color: '#0E0E1C',
                }}
              >
                {answers[quizQuestionNum]}
              </span>
            </div>
          </div>
          {/* grid justify-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-2 tablet:grid-cols-3 2xl:grid-cols-4 */}
          <div className="relative w-full max-w-full">
            <QuizPageQuestionType
              show={quizQuestionNum === 0}
              onChoose={answerToQuestion}
            />
            <QuizPageQuestionAges
              show={quizQuestionNum === 1}
              onChoose={answerToQuestion}
            />
            <QuizPageQuestionGuests
              show={quizQuestionNum === 2}
              onChoose={answerToQuestion}
            />
            <QuizPageFinal
              show={quizQuestionNum === quizAnswers.length}
              onSubmit={onSubmit}
              isQuizSended={isQuizSended}
              handleEnterKeyDown={handleEnterKeyDown}
            />
          </div>
          <div className="flex items-center gap-[30px]">
            <QuizProgress progress={progress} />
            {quizQuestionNum === 0 && (
              <QuizInfo className="hidden max-w-[260px] 2xl:block" />
            )}
          </div>
        </div>
        <div
          className={cn(
            'gradient-mask-tr-80% absolute bottom-0 right-0 h-full w-full overflow-hidden duration-500',
            quizQuestionNum === answers.length ? 'opacity-100' : 'opacity-0'
          )}
        >
          <img
            // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
            className="absolute -right-[80px] bottom-[150px] hidden max-h-[57%] object-contain tablet:bottom-0 tablet:right-[calc(10%-117px)] tablet:block tablet:max-h-[90%] xl:right-0 2xl:max-h-[95%]"
            alt="magican"
            src="/img/quiz/final.png"
            draggable={false}
          />
          <img
            // className="object-cover min-w-[270px] md:min-w-[360px] inline aspect-[9/7]"
            className="mask-bottom absolute right-[calc(34%-200px)] top-[135px] max-h-[57%] object-contain sm:-right-0 sm:top-[70px] sm:max-h-[70%] md:right-[calc(40%-360px)] md:top-[200px] md:max-h-[60%] tablet:hidden"
            alt="magican"
            src="/img/quiz/final.png"
            draggable={false}
          />
          <img
            className="absolute left-[450px] top-[440px] hidden aspect-[165/247] w-[130px] -rotate-[5deg] object-contain opacity-10 xl:block 2xl:left-[500px] 2xl:top-[380px] 2xl:w-[165px]"
            style={{
              mixBlendMode: 'luminosity',
            }}
            alt="cup"
            src="/img/cup.png"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}

export default Quiz
