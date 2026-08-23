/* eslint-disable @next/next/no-img-element */
import getUserAvatarSrc from '@helpers/getUserAvatarSrc'
import cn from 'classnames'

const Avatar = ({ user, className }) => (
  <img
    // onClick={() => closeMenu()}
    className={cn(
      'h-11 w-11 min-w-9 cursor-pointer rounded-full border border-white/50 object-cover',
      user?.impersonation?.active
        ? 'ring-4 ring-red-600 ring-offset-1 ring-offset-white'
        : '',
      className
    )}
    src={getUserAvatarSrc(user)}
    alt="Аватар пользователя"
    title={
      user?.impersonation?.active
        ? 'Вы вошли от имени другого пользователя'
        : undefined
    }
  />
)

export default Avatar
