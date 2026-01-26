'use client'

import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import LoadingSpinner from '@components/LoadingSpinner'
import UserName from '@components/UserName'
import getUserAvatarSrc from '@helpers/getUserAvatarSrc'
import modalsFuncAtom from '@state/atoms/modalsFuncAtom'
import loadingAtom from '@state/atoms/loadingAtom'
import errorAtom from '@state/atoms/errorAtom'
import userSelector from '@state/selectors/userSelector'
import { useAtomValue } from 'jotai'
import tariffsAtom from '@state/atoms/tariffsAtom'

const UserCard = ({ userId, hidden = false, style }) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const user = useAtomValue(userSelector(userId))
  const loading = useAtomValue(loadingAtom('user' + userId))
  const error = useAtomValue(errorAtom('user' + userId))
  const tariffs = useAtomValue(tariffsAtom)
  // const widthNum = useWindowDimensionsTailwindNum()
  // const itemFunc = useAtomValue(itemsFuncAtom)

  // const userStatusArr = USERS_STATUSES.find(
  //   (userStatus) => userStatus.value === user.status
  // )

  const tariffTitle = (() => {
    if (!user?.tariffId) return 'Не выбран'
    const tariff = tariffs.find(
      (item) => String(item?._id) === String(user.tariffId)
    )
    return tariff?.title || 'Не выбран'
  })()

  const tariffPaidUntil = (() => {
    if (!user?.tariffActiveUntil) return null
    const date = new Date(user.tariffActiveUntil)
    if (Number.isNaN(date.getTime())) return null
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  })()

  const formattedBalance = (() => {
    const value = Number(user?.balance ?? 0)
    if (!Number.isFinite(value)) return '0'
    return value.toLocaleString('ru-RU')
  })()

  if (!user) return null

  return (
    <div style={style} className="px-2 py-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && modalsFunc.user.view(user._id)}
        className="relative flex w-full h-full p-4 overflow-visible text-left transition bg-white border border-gray-200 shadow-sm cursor-pointer group rounded-xl hover:border-gray-300 hover:shadow-card"
      >
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-800 bg-opacity-80 text-2xl text-white rounded-xl">
            ОШИБКА
          </div>
        )}
        {loading && !error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-general bg-opacity-80 rounded-xl">
            <LoadingSpinner />
          </div>
        )}
        <div
          className="absolute z-10 top-2 right-2"
          onClick={(event) => event.stopPropagation()}
        >
          <CardButtons
            item={user}
            typeOfItem="user"
            minimalActions
            alwaysCompact
          />
        </div>
        <div className="flex w-full h-full gap-3">
          <img
            className="h-16 w-16 min-w-[64px] rounded-lg object-cover"
            src={getUserAvatarSrc(user)}
            alt="user"
          />
          <div className="relative flex flex-col flex-1 gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <UserName
                user={user}
                className="text-base font-semibold text-gray-900"
              />
            </div>
            <div className="text-xs font-semibold text-gray-600">
              Тариф: {tariffTitle}
              {tariffPaidUntil ? ` (${tariffPaidUntil})` : ''}
            </div>
            <div className="text-xs font-semibold text-gray-600">
              Баланс: {formattedBalance} руб.
            </div>
            <div className="flex justify-end mt-auto sm:absolute sm:right-0 sm:bottom-0">
              <ContactsIconsButtons user={user} className="justify-end" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserCard
