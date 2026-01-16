import {
  faBell,
  // faHome,
  // faListAlt,
  faSignInAlt,
  faSignOutAlt,
  faUserAlt,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import getParentDir from '@state/atoms/getParentDir'
import menuOpenAtom from '@state/atoms/menuOpen'
import cn from 'classnames'
import { motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
// import { useRouter } from 'next/router'
import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import Avatar from './Avatar'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
// import { faCalendarAlt } from '@fortawesome/free-regular-svg-icons'

const variants = {
  show: {
    scale: 1,
    // width: 'auto',
    // height: 'auto',
    top: 0,
    right: 0,
    translateX: 0,
    translateY: 0,
  },
  hide: {
    scale: 0,
    top: 7,
    right: 7,
    // width: 0,
    // height: 0,
    translateX: '50%',
    translateY: '-50%',
  },
}

const MenuItem = ({ onClick, icon, title, href }) => {
  const Component = (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-x-2 border border-gray-300 bg-white px-3 py-2 duration-300 hover:bg-gray-500"
    >
      <FontAwesomeIcon
        icon={icon}
        className="text-general h-5 w-5 group-hover:text-white"
      />
      <span className="prevent-select-text whitespace-nowrap text-black group-hover:text-white">
        {title}
      </span>
    </div>
  )

  if (href)
    return (
      <Link href={href} shallow>
        {Component}
      </Link>
    )
  else return Component
}

const UserMenu = () => {
  const setMenuOpen = useSetAtom(menuOpenAtom)
  const [isUserMenuOpened, setIsUserMenuOpened] = useState(false)
  const [turnOnHandleMouseOver, setTurnOnHandleMouseOver] = useState(true)
  const loggedUser = useAtomValue(loggedUserAtom)

  // const router = useRouter()

  const handleMouseOver = () => {
    if (turnOnHandleMouseOver) {
      setMenuOpen(false)
      setIsUserMenuOpened(true)
    }
  }

  const handleMouseOut = () => setIsUserMenuOpened(false)

  return (
    <div
      className="z-50 flex h-16 items-start justify-end"
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onClick={() => {
        setTurnOnHandleMouseOver(false)
        setIsUserMenuOpened(!isUserMenuOpened)
        const timer = setTimeout(() => {
          setTurnOnHandleMouseOver(true)
          clearTimeout(timer)
        }, 500)
      }}
    >
      <div className="relative mt-2.5 flex w-12 flex-col items-end">
        <Avatar user={loggedUser} className="z-10" />
        {/* {router && ( */}
        <motion.div
          className={cn(
            'absolute overflow-hidden rounded-tr-3xl border border-gray-800 duration-300'
            // isUserMenuOpened
            //   ? 'scale-100 h-auto translate-y-0 translate-x-0 w-auto'
            //   : 'w-0 h-0 scale-0 translate-x-[40%] -translate-y-1/2'
          )}
          variants={variants}
          animate={isUserMenuOpened ? 'show' : 'hide'}
          initial="hide"
          transition={{ duration: 0.2, type: 'tween' }}
        >
          <div className="bg-general flex h-11 cursor-default flex-col justify-center rounded-tr-3xl border-b border-gray-800 px-3 py-1 leading-4 font-bold text-white">
            <span>{loggedUser?.firstName}</span>
            <span>{loggedUser?.secondName}</span>
          </div>
          {/* <MenuItem
              href="/cabinet/events"
              icon={faCalendarAlt}
              title="Мероприятия"
            /> */}
          <MenuItem
            href="/cabinet/questionnaire"
            icon={faUserAlt}
            title="Моя анкета"
          />
          <MenuItem
            href="/cabinet/notifications"
            icon={faBell}
            title="Настройка уведомлений"
          />
          {/* {getParentDir(router.asPath) === 'cabinet' && (
              <MenuItem href="/" icon={faHome} title="Главная страница сайта" />
            )} */}
          {/* {getParentDir(router.asPath) === 'cabinet' ? (
              <MenuItem href="/" icon={faHome} title="Главная страница сайта" />
            ) : (
              <MenuItem href="/cabinet" icon={faListAlt} title="Мой кабинет" />
            )} */}
          <MenuItem
            onClick={signOut}
            icon={faSignOutAlt}
            title="Выйти из учетной записи"
          />
        </motion.div>
        {/* )} */}
      </div>
    </div>
  )
}

export default UserMenu
