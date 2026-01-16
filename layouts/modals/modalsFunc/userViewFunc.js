import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import FormWrapper from '@components/FormWrapper'
import ImageGallery from '@components/ImageGallery'
import TextLine from '@components/TextLine'
import UserName from '@components/UserName'
import ValueItem from '@components/ValuePicker/ValueItem'
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons'
import { GENDERS } from '@helpers/constants'
import formatDate from '@helpers/formatDate'
import { modalsFuncAtom } from '@state/atoms'
import eventsUsersSignedUpWithEventStatusByUserIdCountSelector from '@state/selectors/eventsUsersSignedUpWithEventStatusByUserIdCountSelector'
import isLoggedUserMemberSelector from '@state/selectors/isLoggedUserMemberSelector'
import loggedUserActiveRoleSelector from '@state/selectors/loggedUserActiveRoleSelector'
import userSelector from '@state/selectors/userSelector'
import { useEffect } from 'react'
import { useAtomValue } from 'jotai'

const CardButtonsComponent = ({ user }) => (
  <CardButtons item={user} typeOfItem="user" forForm />
)

const userViewFunc = (userId, params = {}) => {
  const UserModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
    setTopLeftComponent,
  }) => {
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const isLoggedUserMember = useAtomValue(isLoggedUserMemberSelector)
    const loggedUserActiveRole = useAtomValue(loggedUserActiveRoleSelector)
    const isLoggedUserDev = loggedUserActiveRole?.dev
    const seeUserEvents = loggedUserActiveRole?.users?.seeUserEvents

    const user = useAtomValue(userSelector(userId))

    const eventsUsersSignedUpCount = useAtomValue(
      eventsUsersSignedUpWithEventStatusByUserIdCountSelector(userId)
    )

    useEffect(() => {
      if (!user) closeModal()
    }, [user])

    useEffect(() => {
      if (setTopLeftComponent)
        setTopLeftComponent(() => (
          <CardButtons
            item={user}
            typeOfItem="user"
            forForm
            showDeleteButton={false}
          />
        ))
    }, [setTopLeftComponent])

    if (!user) return null

    return (
      <FormWrapper flex className="flex-col">
        <ImageGallery images={user?.images} />
        <div className="mt-1 flex flex-1 flex-col">
          <div className="relative mb-1 flex min-h-6 items-center gap-x-2">
            {/* {user.status === 'member' && (
              <Tooltip title="Участник клуба">
                <div className="w-6 h-6">
                  <Image
                    src="/img/svg_icons/medal.svg"
                    width="24"
                    height="24"
                  />
                </div>
              </Tooltip>
            )} */}
            <UserName user={user} className="text-lg font-bold" />
            {!setTopLeftComponent && (
              <div className="absolute right-0">
                <CardButtonsComponent user={user} />
              </div>
            )}
          </div>
          {user.personalStatus && (
            <div className="pb-3 pt-1 text-sm font-normal italic leading-[15px] text-general">
              {user.personalStatus}
            </div>
          )}
          {isLoggedUserDev && <TextLine label="ID">{user?._id}</TextLine>}
          <TextLine label="Пол">
            {GENDERS.find((item) => item.value === user.gender)?.name ??
              '[не указан]'}
          </TextLine>
          {/* <div className="flex gap-x-2">
              <span className="font-bold">Ориентация:</span>
              <span>
                {
                  ORIENTATIONS.find((item) => item.value === user.orientation)
                    ?.name
                }
              </span>
            </div> */}
          <TextLine label="Место проживания">
            {user.town ?? '[не указано]'}
          </TextLine>
          <ContactsIconsButtons
            user={user}
            withTitle
            grid
            forceShowAll={params?.showContacts}
          />
          <TextLine label="Дата регистрации">
            {formatDate(user.createdAt)}
          </TextLine>

          <div className="flex flex-col gap-x-2 gap-y-1 tablet:flex-row tablet:items-center">
            <div className="flex flex-col">
              <TextLine label="Посетил мероприятий">
                {eventsUsersSignedUpCount.finished}
              </TextLine>
              <TextLine label="Записан на мероприятия">
                {eventsUsersSignedUpCount.signUp}
              </TextLine>
            </div>

            {Boolean(modalsFunc.user?.events) &&
              (seeUserEvents || isLoggedUserMember) &&
              (eventsUsersSignedUpCount.finished > 0 ||
                eventsUsersSignedUpCount.signUp > 0) && (
                <ValueItem
                  name="Посмотреть мероприятия с пользователем"
                  color="general"
                  icon={faCalendarAlt}
                  hoverable
                  onClick={() => modalsFunc.user.events(userId)}
                />
              )}
          </div>
        </div>

        {/* <SelectEventList
          eventsId={eventUsers.map((eventUser) => eventUser.eventId)}
          readOnly
        /> */}
      </FormWrapper>
    )
  }

  return {
    title: `Профиль пользователя`,
    declineButtonName: 'Закрыть',
    closeButtonShow: true,
    Children: UserModal,
    // TopLeftComponent: () => {
    //   return (
    //   <CardButtons id={userId} typeOfItem="user" forForm direction="right" />
    // )},
  }
}

export default userViewFunc
