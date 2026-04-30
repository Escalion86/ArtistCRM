/* eslint-disable react-hooks/exhaustive-deps */
import Button from '@components/Button'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import UserName from '@components/UserName'
import useSnackbar from '@helpers/useSnackbar'
import userSelector from '@state/selectors/userSelector'
import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'

const userTopupInfoFunc = (userId) => {
  const UserTopupInfoModal = ({ closeModal }) => {
    const user = useAtomValue(userSelector(userId))
    const snackbar = useSnackbar()
    const [amount, setAmount] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
      if (!user) closeModal()
    }, [user])

    if (!user) return null

    const handleTopup = async () => {
      const value = Number(amount)
      if (!Number.isFinite(value) || value <= 0) {
        snackbar.error('Укажите сумму пополнения')
        return
      }
      setIsSaving(true)
      try {
        const response = await fetch('/api/billing/yookassa/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purpose: 'balance',
            amount: value,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        const confirmationUrl = payload?.data?.confirmationUrl
        if (!response.ok || !payload?.success || !confirmationUrl) {
          snackbar.error(payload?.error || 'Не удалось создать платеж')
          return
        }
        window.location.href = confirmationUrl
      } finally {
        setIsSaving(false)
      }
    }

    return (
      <FormWrapper flex className="flex-col gap-3">
        <UserName user={user} className="text-lg font-bold" />
        <div className="text-sm text-gray-700">
          Деньги зачислятся на баланс после подтверждения оплаты ЮKassa.
        </div>
        <Input
          label="Сумма (руб.)"
          type="number"
          value={amount}
          onChange={setAmount}
          step={100}
        />
        <div className="flex justify-end">
          <Button
            name="Перейти к оплате"
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
    Children: UserTopupInfoModal,
  }
}

export default userTopupInfoFunc

