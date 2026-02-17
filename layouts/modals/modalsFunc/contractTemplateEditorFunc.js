import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import FormWrapper from '@components/FormWrapper'
import MutedText from '@components/MutedText'
import AppButton from '@components/AppButton'
import Input from '@components/Input'
import InputWrapper from '@components/InputWrapper'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { postData } from '@helpers/CRUD'
import {
  DEFAULT_CONTRACT_TEMPLATE,
  CONTRACT_TEMPLATE_VARIABLES,
} from '@helpers/generateContractTemplate'
import getPersonFullName from '@helpers/getPersonFullName'

const contractTemplateEditorFunc = () => {
  const ContractTemplateEditorModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
  }) => {
    const loggedUser = useAtomValue(loggedUserAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    const custom = useMemo(
      () => siteSettings?.custom ?? {},
      [siteSettings?.custom]
    )
    const [template, setTemplate] = useState(
      typeof custom?.contractTemplate === 'string'
        ? custom.contractTemplate
        : DEFAULT_CONTRACT_TEMPLATE
    )
    const [artistFullName, setArtistFullName] = useState(
      custom?.contractArtistFullName ?? getPersonFullName(loggedUser)
    )
    const [artistName, setArtistName] = useState(
      custom?.contractArtistName ?? getPersonFullName(loggedUser)
    )
    const [artistOgrnip, setArtistOgrnip] = useState(
      custom?.contractArtistOgrnip ?? ''
    )
    const [artistStatus, setArtistStatus] = useState(
      custom?.contractArtistStatus === 'self_employed'
        ? 'self_employed'
        : 'individual_entrepreneur'
    )
    const [artistInn, setArtistInn] = useState(custom?.contractArtistInn ?? '')
    const [artistBankName, setArtistBankName] = useState(
      custom?.contractArtistBankName ?? ''
    )
    const [artistBik, setArtistBik] = useState(custom?.contractArtistBik ?? '')
    const [artistCheckingAccount, setArtistCheckingAccount] = useState(
      custom?.contractArtistCheckingAccount ?? ''
    )
    const [artistCorrespondentAccount, setArtistCorrespondentAccount] =
      useState(custom?.contractArtistCorrespondentAccount ?? '')
    const [artistLegalAddress, setArtistLegalAddress] = useState(
      custom?.contractArtistLegalAddress ?? ''
    )

    const currentTemplate =
      typeof custom?.contractTemplate === 'string'
        ? custom.contractTemplate
        : DEFAULT_CONTRACT_TEMPLATE
    const currentArtistFullName = custom?.contractArtistFullName ?? ''
    const currentArtistName = custom?.contractArtistName ?? ''
    const currentArtistOgrnip = custom?.contractArtistOgrnip ?? ''
    const currentArtistStatus =
      custom?.contractArtistStatus === 'self_employed'
        ? 'self_employed'
        : 'individual_entrepreneur'
    const currentArtistInn = custom?.contractArtistInn ?? ''
    const currentArtistBankName = custom?.contractArtistBankName ?? ''
    const currentArtistBik = custom?.contractArtistBik ?? ''
    const currentArtistCheckingAccount =
      custom?.contractArtistCheckingAccount ?? ''
    const currentArtistCorrespondentAccount =
      custom?.contractArtistCorrespondentAccount ?? ''
    const currentArtistLegalAddress = custom?.contractArtistLegalAddress ?? ''

    const isChanged = useMemo(
      () =>
        template !== currentTemplate ||
        (artistFullName ?? '') !== currentArtistFullName ||
        (artistName ?? '') !== currentArtistName ||
        (artistOgrnip ?? '') !== currentArtistOgrnip ||
        (artistStatus ?? 'individual_entrepreneur') !== currentArtistStatus ||
        (artistInn ?? '') !== currentArtistInn ||
        (artistBankName ?? '') !== currentArtistBankName ||
        (artistBik ?? '') !== currentArtistBik ||
        (artistCheckingAccount ?? '') !== currentArtistCheckingAccount ||
        (artistCorrespondentAccount ?? '') !==
          currentArtistCorrespondentAccount ||
        (artistLegalAddress ?? '') !== currentArtistLegalAddress,
      [
        artistFullName,
        artistName,
        artistOgrnip,
        artistStatus,
        artistInn,
        artistBankName,
        artistBik,
        artistCheckingAccount,
        artistCorrespondentAccount,
        artistLegalAddress,
        currentArtistFullName,
        currentArtistName,
        currentArtistOgrnip,
        currentArtistStatus,
        currentArtistInn,
        currentArtistBankName,
        currentArtistBik,
        currentArtistCheckingAccount,
        currentArtistCorrespondentAccount,
        currentArtistLegalAddress,
        currentTemplate,
        template,
      ]
    )

    useEffect(() => {
      if (isChanged) return
      setTemplate(currentTemplate)
      setArtistFullName(currentArtistFullName)
      setArtistName(currentArtistName)
      setArtistOgrnip(currentArtistOgrnip)
      setArtistStatus(currentArtistStatus)
      setArtistInn(currentArtistInn)
      setArtistBankName(currentArtistBankName)
      setArtistBik(currentArtistBik)
      setArtistCheckingAccount(currentArtistCheckingAccount)
      setArtistCorrespondentAccount(currentArtistCorrespondentAccount)
      setArtistLegalAddress(currentArtistLegalAddress)
    }, [
      currentArtistFullName,
      currentArtistName,
      currentArtistOgrnip,
      currentArtistStatus,
      currentArtistInn,
      currentArtistBankName,
      currentArtistBik,
      currentArtistCheckingAccount,
      currentArtistCorrespondentAccount,
      currentArtistLegalAddress,
      currentTemplate,
      isChanged,
    ])

    const handleSave = useCallback(async () => {
      await postData(
        '/api/site',
        {
          custom: {
            ...(custom ?? {}),
            contractTemplate: template,
            contractArtistFullName: artistFullName.trim(),
            contractArtistName: artistName.trim(),
            contractArtistOgrnip: artistOgrnip.trim(),
            contractArtistStatus: artistStatus,
            contractArtistInn: artistInn.trim(),
            contractArtistBankName: artistBankName.trim(),
            contractArtistBik: artistBik.trim(),
            contractArtistCheckingAccount: artistCheckingAccount.trim(),
            contractArtistCorrespondentAccount:
              artistCorrespondentAccount.trim(),
            contractArtistLegalAddress: artistLegalAddress.trim(),
          },
        },
        (data) => setSiteSettings(data),
        null,
        false,
        loggedUser?._id
      )
      closeModal()
    }, [
      artistFullName,
      artistName,
      artistOgrnip,
      artistStatus,
      artistInn,
      artistBankName,
      artistBik,
      artistCheckingAccount,
      artistCorrespondentAccount,
      artistLegalAddress,
      closeModal,
      custom,
      loggedUser?._id,
      setSiteSettings,
      template,
    ])

    const hasPerformerRequisites = useMemo(
      () =>
        Boolean(
          artistInn.trim() &&
          artistBankName.trim() &&
          artistBik.trim() &&
          artistCheckingAccount.trim() &&
          artistCorrespondentAccount.trim() &&
          artistLegalAddress.trim() &&
          (artistStatus === 'self_employed' || artistOgrnip.trim())
        ),
      [
        artistInn,
        artistBankName,
        artistBik,
        artistCheckingAccount,
        artistCorrespondentAccount,
        artistLegalAddress,
        artistOgrnip,
        artistStatus,
      ]
    )

    useEffect(() => {
      setDisableConfirm(!isChanged)
      setOnShowOnCloseConfirmDialog(isChanged)
      setOnConfirmFunc(isChanged ? handleSave : undefined)
    }, [
      handleSave,
      isChanged,
      setDisableConfirm,
      setOnConfirmFunc,
      setOnShowOnCloseConfirmDialog,
    ])

    return (
      <FormWrapper className="flex h-full flex-col gap-2">
        <div className="tablet:grid-cols-2 mt-2 grid grid-cols-1 gap-3">
          <Input
            label="ФИО артиста (для договора)"
            value={artistFullName}
            onChange={setArtistFullName}
            noMargin
          />
          <Input
            label="Наименование артиста"
            value={artistName}
            onChange={setArtistName}
            noMargin
          />
          <InputWrapper label="Юр. статус артиста" noMargin>
            <div className="flex items-center gap-2">
              <AppButton
                variant={
                  artistStatus === 'individual_entrepreneur'
                    ? 'primary'
                    : 'secondary'
                }
                size="sm"
                className="cursor-pointer rounded"
                onClick={() => setArtistStatus('individual_entrepreneur')}
              >
                Индивидуальный предприниматель
              </AppButton>
              <AppButton
                variant={
                  artistStatus === 'self_employed' ? 'primary' : 'secondary'
                }
                size="sm"
                className="cursor-pointer rounded"
                onClick={() => setArtistStatus('self_employed')}
              >
                Самозанятый
              </AppButton>
            </div>
          </InputWrapper>
          <Input
            label="ОГРНИП артиста"
            value={artistOgrnip}
            onChange={setArtistOgrnip}
            noMargin
            className={artistStatus === 'self_employed' ? 'hidden' : ''}
          />
          <Input
            label="ИНН артиста"
            value={artistInn}
            onChange={setArtistInn}
            noMargin
          />
          <Input
            label="Банк артиста"
            value={artistBankName}
            onChange={setArtistBankName}
            noMargin
          />
          <Input
            label="БИК артиста"
            value={artistBik}
            onChange={setArtistBik}
            noMargin
          />
          <Input
            label="Расчетный счет артиста"
            value={artistCheckingAccount}
            onChange={setArtistCheckingAccount}
            noMargin
          />
          <Input
            label="Корр. счет артиста"
            value={artistCorrespondentAccount}
            onChange={setArtistCorrespondentAccount}
            noMargin
          />
          <Input
            label="Юр. адрес артиста"
            value={artistLegalAddress}
            onChange={setArtistLegalAddress}
            noMargin
          />
        </div>
        {!hasPerformerRequisites && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Заполните реквизиты исполнителя. В шаблоне по умолчанию используются
            ваши реквизиты.
          </div>
        )}
        <MutedText className="text-gray-500">
          Используйте переменные в фигурных скобках, например: {'{ИНН}'},{' '}
          {'{ФИО КЛИЕНТА}'}. Поддерживаются варианты и с пробелами, и с `_`.
        </MutedText>
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-700">Текст шаблона договора</div>
          <textarea
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            className="min-h-[520px] w-full resize-y rounded border border-gray-300 bg-transparent p-2 text-sm leading-6 outline-none focus:border-[#c9a86a]"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <MutedText className="text-gray-500">
            Переменные:{' '}
            {CONTRACT_TEMPLATE_VARIABLES.map((item) => `{${item}}`).join(', ')}
          </MutedText>
          <AppButton
            variant="secondary"
            size="sm"
            className="cursor-pointer rounded"
            onClick={() => setTemplate(DEFAULT_CONTRACT_TEMPLATE)}
          >
            Сбросить шаблон
          </AppButton>
        </div>
      </FormWrapper>
    )
  }

  return {
    title: 'Редактор шаблона договора',
    confirmButtonName: 'Сохранить',
    Children: ContractTemplateEditorModal,
  }
}

export default contractTemplateEditorFunc
