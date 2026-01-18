import CardButtons from '@components/CardButtons'
import ContactsIconsButtons from '@components/ContactsIconsButtons'
import FormWrapper from '@components/FormWrapper'
import ImageGallery from '@components/ImageGallery'
import TextLine from '@components/TextLine'
import UserName from '@components/UserName'
import { GENDERS } from '@helpers/constants'
import formatDate from '@helpers/formatDate'
import loggedUserActiveRoleSelector from '@state/selectors/loggedUserActiveRoleSelector'
import userSelector from '@state/selectors/userSelector'
import tariffsAtom from '@state/atoms/tariffsAtom'
import { useEffect, useMemo } from 'react'
import { useAtomValue } from 'jotai'

const CardButtonsComponent = ({ user }) => (
  <CardButtons
    item={user}
    typeOfItem="user"
    minimalActions
    alwaysCompact
  />
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
    const loggedUserActiveRole = useAtomValue(loggedUserActiveRoleSelector)
    const isLoggedUserDev = loggedUserActiveRole?.dev

    const user = useAtomValue(userSelector(userId))
    const tariffs = useAtomValue(tariffsAtom)

    useEffect(() => {
      if (!user) closeModal()
    }, [user])

    useEffect(() => {
      if (setTopLeftComponent)
        setTopLeftComponent(() => <CardButtonsComponent user={user} />)
    }, [setTopLeftComponent])

    if (!user) return null

    const tariffInfo = useMemo(() => {
      if (!user?.tariffId) return 'Не выбран'
      const tariff = tariffs.find(
        (item) => String(item?._id) === String(user.tariffId)
      )
      const title = tariff?.title || 'Тариф'
      if (!user?.tariffActiveUntil) return title
      const date = new Date(user.tariffActiveUntil)
      if (Number.isNaN(date.getTime())) return title
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${title} (${day}.${month}.${year})`
    }, [tariffs, user?.tariffId, user?.tariffActiveUntil])

    const formattedBalance = useMemo(() => {
      const value = Number(user?.balance ?? 0)
      if (!Number.isFinite(value)) return '0'
      return value.toLocaleString('ru-RU')
    }, [user?.balance])

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
          <TextLine label="Роль">{user?.role ?? '[не указано]'}</TextLine>
          <TextLine label="Тариф">{tariffInfo}</TextLine>
          <TextLine label="Баланс">{formattedBalance} руб.</TextLine>
          <ContactsIconsButtons
            user={user}
            withTitle
            grid
            forceShowAll={params?.showContacts}
          />
          <TextLine label="Дата регистрации">
            {formatDate(user.createdAt)}
          </TextLine>
        </div>

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
