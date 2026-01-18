import FormWrapper from '@components/FormWrapper'
import UserName from '@components/UserName'
import userSelector from '@state/selectors/userSelector'
import { useEffect } from 'react'
import { useAtomValue } from 'jotai'

const userTopupInfoFunc = (userId) => {
  const UserTopupInfoModal = ({ closeModal }) => {
    const user = useAtomValue(userSelector(userId))

    useEffect(() => {
      if (!user) closeModal()
    }, [user])

    if (!user) return null

    return (
      <FormWrapper flex className="flex-col gap-3">
        <UserName user={user} className="text-lg font-bold" />
        <div className="text-sm text-gray-700">
          Пополнение баланса через ЮKassa пока недоступно.
        </div>
        <div className="text-sm text-gray-700">
          Для пополнения свяжитесь с администратором.
        </div>
      </FormWrapper>
    )
  }

  return {
    title: 'Пополнение баланса',
    declineButtonName: 'Закрыть',
    closeButtonShow: true,
    Children: UserTopupInfoModal,
  }
}

export default userTopupInfoFunc
