import ErrorsList from '@components/ErrorsList'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import InputWrapper from '@components/InputWrapper'
import LabeledContainer from '@components/LabeledContainer'
import PhoneInput from '@components/PhoneInput'
import { CLIENT_TYPES, DEFAULT_CLIENT } from '@helpers/constants'
import getPersonFullName from '@helpers/getPersonFullName'
import useErrors from '@helpers/useErrors'
import clientSelector from '@state/selectors/clientSelector'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import { modalsFuncAtom } from '@state/atoms'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'

const clientFunc = (clientId, clone = false, onSuccess) => {
  const ClientModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
  }) => {
    const client = useAtomValue(clientSelector(clientId))
    const setClient = useAtomValue(itemsFuncAtom).client.set
    const clients = useAtomValue(clientsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)

    const [firstName, setFirstName] = useState(
      client?.firstName ?? DEFAULT_CLIENT.firstName
    )
    const [secondName, setSecondName] = useState(
      client?.secondName ?? DEFAULT_CLIENT.secondName
    )
    const [thirdName, setThirdName] = useState(
      client?.thirdName ?? DEFAULT_CLIENT.thirdName
    )
    const [phone, setPhone] = useState(client?.phone ?? DEFAULT_CLIENT.phone)
    const [whatsapp, setWhatsapp] = useState(
      client?.whatsapp ?? DEFAULT_CLIENT.whatsapp
    )
    const [telegram, setTelegram] = useState(
      client?.telegram ?? DEFAULT_CLIENT.telegram
    )
    const [instagram, setInstagram] = useState(
      client?.instagram ?? DEFAULT_CLIENT.instagram
    )
    const [vk, setVk] = useState(client?.vk ?? DEFAULT_CLIENT.vk)
    const [clientType, setClientType] = useState(
      client?.clientType ?? DEFAULT_CLIENT.clientType
    )
    const [legalName, setLegalName] = useState(
      client?.legalName ?? DEFAULT_CLIENT.legalName
    )
    const [inn, setInn] = useState(client?.inn ?? DEFAULT_CLIENT.inn)
    const [kpp, setKpp] = useState(client?.kpp ?? DEFAULT_CLIENT.kpp)
    const [ogrn, setOgrn] = useState(client?.ogrn ?? DEFAULT_CLIENT.ogrn)
    const [bankName, setBankName] = useState(
      client?.bankName ?? DEFAULT_CLIENT.bankName
    )
    const [bik, setBik] = useState(client?.bik ?? DEFAULT_CLIENT.bik)
    const [checkingAccount, setCheckingAccount] = useState(
      client?.checkingAccount ?? DEFAULT_CLIENT.checkingAccount
    )
    const [correspondentAccount, setCorrespondentAccount] = useState(
      client?.correspondentAccount ?? DEFAULT_CLIENT.correspondentAccount
    )
    const [legalAddress, setLegalAddress] = useState(
      client?.legalAddress ?? DEFAULT_CLIENT.legalAddress
    )
    const [errors, checkErrors, addError, removeError] = useErrors()

    const normalizePhoneValue = useCallback((value) => {
      if (!value) return null
      const digits = String(value).replace(/[^\d]/g, '')
      if (digits.length < 11) return null
      const normalized = digits.slice(0, 11)
      if (normalized.startsWith('8')) return `7${normalized.slice(1)}`
      if (normalized.startsWith('7')) return normalized
      return null
    }, [])

    const isFormChanged = useMemo(
      () =>
        (client?.firstName ?? DEFAULT_CLIENT.firstName) !== firstName ||
        (client?.secondName ?? DEFAULT_CLIENT.secondName) !== secondName ||
        (client?.thirdName ?? DEFAULT_CLIENT.thirdName) !== thirdName ||
        (client?.phone ?? DEFAULT_CLIENT.phone) !== phone ||
        (client?.whatsapp ?? DEFAULT_CLIENT.whatsapp) !== whatsapp ||
        (client?.telegram ?? DEFAULT_CLIENT.telegram) !== telegram ||
        (client?.instagram ?? DEFAULT_CLIENT.instagram) !== instagram ||
        (client?.vk ?? DEFAULT_CLIENT.vk) !== vk ||
        (client?.clientType ?? DEFAULT_CLIENT.clientType) !== clientType ||
        (client?.legalName ?? DEFAULT_CLIENT.legalName) !== legalName ||
        (client?.inn ?? DEFAULT_CLIENT.inn) !== inn ||
        (client?.kpp ?? DEFAULT_CLIENT.kpp) !== kpp ||
        (client?.ogrn ?? DEFAULT_CLIENT.ogrn) !== ogrn ||
        (client?.bankName ?? DEFAULT_CLIENT.bankName) !== bankName ||
        (client?.bik ?? DEFAULT_CLIENT.bik) !== bik ||
        (client?.checkingAccount ?? DEFAULT_CLIENT.checkingAccount) !==
          checkingAccount ||
        (client?.correspondentAccount ??
          DEFAULT_CLIENT.correspondentAccount) !== correspondentAccount ||
        (client?.legalAddress ?? DEFAULT_CLIENT.legalAddress) !== legalAddress,
      [
        client,
        firstName,
        phone,
        secondName,
        thirdName,
        whatsapp,
        telegram,
        instagram,
        vk,
        clientType,
        legalName,
        inn,
        kpp,
        ogrn,
        bankName,
        bik,
        checkingAccount,
        correspondentAccount,
        legalAddress,
      ]
    )

    const onClickConfirm = useCallback(async () => {
        const hasPhoneError = checkErrors({ phone: phone, whatsapp: whatsapp })
        let customError = false
        if (!firstName || !firstName.trim()) {
          addError({ firstName: 'Укажите имя' })
          customError = true
        }
        if (!hasPhoneError && !customError) {
          const normalizedPhone = normalizePhoneValue(phone)
          if (normalizedPhone) {
            const existedClient = clients.find(
              (item) =>
                item?.phone &&
                normalizePhoneValue(item.phone) === normalizedPhone &&
                item._id !== client?._id
            )
            if (existedClient) {
              const existingName =
                getPersonFullName(existedClient, { fallback: 'Без имени' })
              if (typeof onSuccess === 'function') {
                modalsFunc.add({
                  title: 'Клиент уже существует',
                  text: `Клиент с таким номером телефона уже существует: ${existingName}.\n\nВы можете выбрать существующего клиента.`,
                  confirmButtonName: 'Выбрать клиента',
                  declineButtonName: 'Закрыть',
                  onConfirm: () => {
                    onSuccess(existedClient)
                    closeModal()
                  },
                })
              } else {
                modalsFunc.add({
                  title: 'Клиент уже существует',
                  text: `Клиент с таким номером телефона уже существует: ${existingName}.\n\nСоздать клиента с этим номером нельзя.`,
                  confirmButtonName: 'Понятно',
                  onConfirm: true,
                  showDecline: false,
                })
              }
              return
            }
          }
          const result = await setClient(
            {
            _id: client?._id,
            firstName: firstName.trim(),
            secondName: secondName.trim(),
            thirdName: thirdName.trim(),
            phone: phone ?? null,
            whatsapp: whatsapp ?? null,
            telegram: telegram.trim(),
            instagram: instagram.trim(),
            vk: vk.trim(),
            clientType,
            legalName: legalName.trim(),
            inn: inn.trim(),
            kpp: kpp.trim(),
            ogrn: ogrn.trim(),
            bankName: bankName.trim(),
            bik: bik.trim(),
            checkingAccount: checkingAccount.trim(),
            correspondentAccount: correspondentAccount.trim(),
            legalAddress: legalAddress.trim(),
          },
          clone
        )
        if (result && typeof onSuccess === 'function') onSuccess(result)
        closeModal()
      }
    }, [
      addError,
      checkErrors,
      client?._id,
      closeModal,
      firstName,
      phone,
      secondName,
      thirdName,
      whatsapp,
      telegram,
      instagram,
      vk,
      setClient,
      clientType,
      clients,
      modalsFunc,
      normalizePhoneValue,
      legalName,
      inn,
      kpp,
      ogrn,
      bankName,
      bik,
      checkingAccount,
      correspondentAccount,
      legalAddress,
    ])

    const onClickConfirmRef = useRef(onClickConfirm)

    useEffect(() => {
      onClickConfirmRef.current = onClickConfirm
    }, [onClickConfirm])

    const handleCheckPhone = () => {
      removeError('phone')
      const normalizedPhone = normalizePhoneValue(phone)
      if (!normalizedPhone) {
        addError({ phone: 'Укажите корректный номер телефона' })
        return
      }

      const existingClient = clients.find(
        (item) =>
          item?.phone &&
          normalizePhoneValue(item.phone) === normalizedPhone &&
          item._id !== client?._id
      )

      if (!existingClient) {
        addError({ phone: 'Клиент с таким номером не найден' })
        return
      }

      if (typeof onSuccess === 'function') {
        const confirmed = window.confirm(
          `Найден клиент: ${getPersonFullName(existingClient, {
            fallback: 'Без имени',
          })}. Выбрать его?`
        )
        if (confirmed) {
          onSuccess(existingClient)
          closeModal()
        }
        return
      }

      addError({ phone: 'Клиент с таким номером уже существует' })
    }

    useEffect(() => {
      setOnShowOnCloseConfirmDialog(isFormChanged)
      setDisableConfirm(!isFormChanged)
      setOnConfirmFunc(
        isFormChanged ? () => onClickConfirmRef.current() : undefined
      )
    }, [
      setDisableConfirm,
      setOnConfirmFunc,
      setOnShowOnCloseConfirmDialog,
      isFormChanged,
    ])

    return (
      <FormWrapper>
        <Input
          label="Имя"
          value={firstName}
          onChange={(value) => {
            removeError('firstName')
            setFirstName(value)
          }}
          required
          error={errors.firstName}
        />
        <Input label="Фамилия" value={secondName} onChange={setSecondName} />
        <Input label="Отчество" value={thirdName} onChange={setThirdName} />
        <div className="mt-3 flex items-end gap-2">
          <PhoneInput
            label="Телефон"
            value={phone}
            onChange={(value) => {
              removeError('phone')
              setPhone(value)
            }}
            required
            error={errors.phone}
            className="w-full"
            noMargin
            copyPasteButtons
          />
          <button
            type="button"
            className="mb-1 cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm font-semibold whitespace-nowrap text-gray-700 transition hover:bg-gray-50"
            onClick={handleCheckPhone}
          >
            Проверить
          </button>
        </div>
        <div className="grid gap-0 sm:grid-cols-2">
          <PhoneInput
            label="Whatsapp"
            value={whatsapp}
            onChange={(value) => {
              removeError('whatsapp')
              setWhatsapp(value)
            }}
            error={errors.whatsapp}
            className="w-full"
            smallMargin
            copyPasteButtons
          />
          <Input
            label="Telegram"
            value={telegram}
            onChange={setTelegram}
            className="w-full"
            smallMargin
          />
          <Input
            label="Instagram"
            value={instagram}
            onChange={setInstagram}
            className="w-full"
            smallMargin
          />
          <Input
            label="VK"
            value={vk}
            onChange={setVk}
            className="w-full"
            smallMargin
          />
        </div>
        <InputWrapper label="Тип клиента" paddingY fitWidth>
          <div className="flex flex-wrap gap-2">
            {CLIENT_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`rounded border px-3 py-2 text-sm font-semibold transition ${
                  clientType === item.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setClientType(item.value)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </InputWrapper>
        <LabeledContainer label="Реквизиты для договора">
          <div className="grid gap-0 sm:grid-cols-2">
            <Input
              label="Наименование / ФИО"
              value={legalName}
              onChange={setLegalName}
              className="w-full"
              smallMargin
            />
            <Input
              label="ИНН"
              value={inn}
              onChange={setInn}
              className="w-full"
              smallMargin
            />
            <Input
              label="КПП"
              value={kpp}
              onChange={setKpp}
              className="w-full"
              smallMargin
            />
            <Input
              label="ОГРН / ОГРНИП"
              value={ogrn}
              onChange={setOgrn}
              className="w-full"
              smallMargin
            />
            <Input
              label="Банк"
              value={bankName}
              onChange={setBankName}
              className="w-full"
              smallMargin
            />
            <Input
              label="БИК"
              value={bik}
              onChange={setBik}
              className="w-full"
              smallMargin
            />
            <Input
              label="Расчетный счет"
              value={checkingAccount}
              onChange={setCheckingAccount}
              className="w-full"
              smallMargin
            />
            <Input
              label="Корр. счет"
              value={correspondentAccount}
              onChange={setCorrespondentAccount}
              className="w-full"
              smallMargin
            />
            <Input
              label="Юридический адрес"
              value={legalAddress}
              onChange={setLegalAddress}
              className="w-full sm:col-span-2"
              smallMargin
            />
          </div>
        </LabeledContainer>
        <ErrorsList errors={errors} />
      </FormWrapper>
    )
  }

  return {
    title: `${clientId && !clone ? 'Редактирование' : 'Создание'} клиента`,
    confirmButtonName: clientId && !clone ? 'Применить' : 'Создать',
    Children: ClientModal,
  }
}

export default clientFunc
