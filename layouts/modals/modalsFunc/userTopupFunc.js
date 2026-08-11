/* eslint-disable react-hooks/exhaustive-deps */
import Button from '@components/Button'
import CheckBox from '@components/CheckBox'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import Notice from '@components/Notice'
import UserName from '@components/UserName'
import { postData } from '@helpers/CRUD'
import useSnackbar from '@helpers/useSnackbar'
import loggedUserActiveRoleSelector from '@state/selectors/loggedUserActiveRoleSelector'
import userEditSelector from '@state/selectors/userEditSelector'
import userSelector from '@state/selectors/userSelector'
import usersAtom from '@state/atoms/usersAtom'
import { useEffect, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'

const userTopupFunc = (userId, onSuccess) => {
  const UserTopupModal = ({ closeModal }) => {
    const loggedUserActiveRole = useAtomValue(loggedUserActiveRoleSelector)
    const canManageUsers = loggedUserActiveRole?.users?.setRole
    const user = useAtomValue(userSelector(userId))
    const users = useAtomValue(usersAtom)
    const setUser = useSetAtom(userEditSelector)
    const snackbar = useSnackbar()

    const [amount, setAmount] = useState('')
    const [comment, setComment] = useState('')
    const [rewardReferrer, setRewardReferrer] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const referrer = user?.referrerId
      ? users.find((item) => String(item?._id) === String(user.referrerId))
      : null

    useEffect(() => {
      if (!user) closeModal()
    }, [user])

    const handleTopup = async () => {
      if (!user?._id) return
      const value = Number(amount)
      if (!Number.isFinite(value) || value <= 0) {
        snackbar.error('Укажите сумму пополнения')
        return
      }
      setIsSaving(true)
      const result = await postData(
        '/api/payments',
        {
          userId: user._id,
          amount: value,
          comment,
          rewardReferrer: Boolean(referrer && rewardReferrer),
        },
        null,
        null,
        true
      )
      if (result?.success) {
        if (result?.data?.user) setUser(result.data.user)
        snackbar.success('Баланс пополнен')
        if (onSuccess) onSuccess()
        closeModal()
      } else {
        snackbar.error(result?.error || 'Не удалось пополнить баланс')
      }
      setIsSaving(false)
    }

    if (!user) return null
    if (!canManageUsers) {
      return (
        <FormWrapper>
          <div className="text-sm text-gray-500">
            Доступно только администраторам
          </div>
        </FormWrapper>
      )
    }

    return (
      <FormWrapper flex className="flex-col gap-3">
        <UserName user={user} className="text-lg font-bold" />
        <Input
          label="Сумма (руб.)"
          type="number"
          value={amount}
          onChange={setAmount}
          step={100}
        />
        <Input label="Комментарий" value={comment} onChange={setComment} />
        {referrer ? (
          <Notice tone="info" className="rounded-md p-3">
            <div className="text-sm">
              Реферер этого пользователя:{' '}
              <UserName user={referrer} className="inline-flex font-semibold" />
            </div>
            <CheckBox
              checked={rewardReferrer}
              onChange={(event) => setRewardReferrer(event.target.checked)}
              label="Начислить этому рефереру бонус за ручное пополнение?"
              labelClassName="cursor-pointer text-sm"
              wrapperClassName="mt-3 items-start pl-0"
              noMargin
            />
          </Notice>
        ) : null}
        <div className="flex justify-end">
          <Button
            name="Пополнить"
            className="h-9 px-4 text-sm"
            onClick={handleTopup}
            disabled={isSaving}
            loading={isSaving}
          />
        </div>
      </FormWrapper>
    )
  }

  return {
    title: 'Пополнение баланса',
    declineButtonName: 'Закрыть',
    closeButtonShow: true,
    Children: UserTopupModal,
  }
}

export default userTopupFunc
