'use client'

import CardButtons from '@components/CardButtons'
import { CardWrapper } from '@components/CardWrapper'
import TextLinesLimiter from '@components/TextLinesLimiter'
import UserName from '@components/UserName'
import { faGenderless } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GENDERS } from '@helpers/constants'
import getUserAvatarSrc from '@helpers/getUserAvatarSrc'
import modalsFuncAtom from '@state/atoms/modalsFuncAtom'
import loadingAtom from '@state/atoms/loadingAtom'
import eventsUsersSignedUpWithEventStatusByUserIdCountSelector from '@state/selectors/eventsUsersSignedUpWithEventStatusByUserIdCountSelector'
import userSelector from '@state/selectors/userSelector'
import cn from 'classnames'
import { Suspense } from 'react'
import Skeleton from 'react-loading-skeleton'
import { useAtomValue } from 'jotai'

const SignedUpCountComponent = ({ userId }) => {
  const eventsUsersSignedUpCount = useAtomValue(
    eventsUsersSignedUpWithEventStatusByUserIdCountSelector(userId)
  )
  return <span className="font-normal">{eventsUsersSignedUpCount.signUp}</span>
}

const FinishedComponent = ({ userId }) => {
  const eventsUsersSignedUpCount = useAtomValue(
    eventsUsersSignedUpWithEventStatusByUserIdCountSelector(userId)
  )
  return (
    <span className="font-normal">{eventsUsersSignedUpCount.finished}</span>
  )
}

const SignedUpCount = (props) => (
  <Suspense fallback={<Skeleton className="h-[16px] w-[8px] " />}>
    <SignedUpCountComponent {...props} />
  </Suspense>
)

const FinishedCount = (props) => (
  <Suspense fallback={<Skeleton className="h-[16px] w-[8px] " />}>
    <FinishedComponent {...props} />
  </Suspense>
)

const UserCard = ({ userId, hidden = false, style }) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const user = useAtomValue(userSelector(userId))
  const loading = useAtomValue(loadingAtom('user' + userId))
  // const eventUsers = useAtomValue(eventsUsersSignedUpByUserIdSelector(userId))
  // const widthNum = useWindowDimensionsTailwindNum()
  // const itemFunc = useAtomValue(itemsFuncAtom)

  const userGender =
    user.gender && GENDERS.find((gender) => gender.value === user.gender)

  // const userStatusArr = USERS_STATUSES.find(
  //   (userStatus) => userStatus.value === user.status
  // )

  return (
    <CardWrapper
      loading={loading}
      onClick={() => modalsFunc.user.view(user._id)}
      hidden={hidden}
      style={style}
    >
      <div className="flex w-full">
        <div
          className={cn(
            'flex w-8 items-center justify-center',
            userGender ? 'bg-' + userGender.color : 'bg-gray-400'
          )}
        >
          <FontAwesomeIcon
            className="h-8 w-8 text-white"
            icon={userGender ? userGender.icon : faGenderless}
          />
        </div>
        <div className="flex flex-1 flex-col tablet:flex-row">
          <div className="flex flex-1 border-b tablet:border-b-0">
            <img
              className="hidden h-[92px] min-h-[92px] w-[92px] min-w-[92px] object-cover tablet:block"
              src={getUserAvatarSrc(user)}
              alt="user"
              // width={48}
              // height={48}
            />
            <div className="flex flex-1 flex-col text-xl font-bold">
              <div className="flex flex-1">
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-nowrap items-center gap-x-1 px-1 py-0.5 leading-6">
                    <UserName
                      user={user}
                      className="-mt-0.5 h-8 text-base font-bold tablet:mt-0 tablet:h-auto tablet:text-lg"
                      // noWrap
                    />
                    {/* <span>{user.firstName}</span>
                    {user.secondName && <span>{user.secondName}</span>} */}
                    {/* {user.birthday && (
                      <div className="flex items-center font-normal whitespace-nowrap gap-x-2">
                        <span>{birthDateToAge(user.birthday)}</span>
                        <ZodiacIcon date={user.birthday} />
                      </div>
                    )} */}
                    {/* {user.role === 'admin' && (
                      <span className="font-normal text-red-400">
                        АДМИНИСТРАТОР
                      </span>
                    )} */}
                  </div>
                  <div className="flex tablet:h-full">
                    <img
                      className="h-[60px] min-h-[60px] w-[60px] min-w-[60px] object-cover tablet:hidden"
                      src={getUserAvatarSrc(user)}
                      alt="user"
                      // width={48}
                      // height={48}
                    />
                    <div className="flex h-full flex-col justify-end px-1">
                      <div className="flex flex-1 items-center">
                        <TextLinesLimiter
                          className="text-sm font-normal italic leading-[14px] text-general"
                          // textClassName="leading-5"
                          lines={2}
                        >
                          {user.personalStatus}
                        </TextLinesLimiter>
                      </div>

                      {/* <div className="flex text-sm leading-4 gap-x-2 ">
                        <span className="font-bold">Зарегистрирован:</span>
                        <span className="font-normal">
                          {formatDate(user.createdAt)}
                        </span>
                      </div> */}
                      <div className="flex gap-x-2 text-sm leading-4">
                        <span className="font-bold">Посетил:</span>
                        <FinishedCount userId={userId} />
                        <span className="font-bold">Записан:</span>
                        <SignedUpCount userId={userId} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <CardButtons item={user} typeOfItem="user" />
                </div>
              </div>
              {/* <div className="flex-col justify-end flex-1 hidden px-2 tablet:flex"> */}
              {/* <div className="flex-1"> */}
              {/* {user.about && (
                <div>
                  <span className="font-bold">Обо мне:</span>
                  <span>{user.about}</span>
                </div>
              )}
              {user.profession && (
                <div>
                  <span className="font-bold">Профессия:</span>
                  <span>{user.profession}</span>
                </div>
              )}
              {user.interests && (
                <div>
                  <span className="font-bold">Интересы:</span>
                  <span>{user.interests}</span>
                </div>
              )} */}
              {/* </div> */}
              {/* <ContactsIconsButtons
                className="hidden px-2 tablet:flex"
                user={user}
              /> */}
              {/* </div> */}
            </div>
          </div>
          {/* <ContactsIconsButtons className="px-2 tablet:hidden" user={user} /> */}
        </div>
      </div>
    </CardWrapper>
  )
}

export default UserCard
