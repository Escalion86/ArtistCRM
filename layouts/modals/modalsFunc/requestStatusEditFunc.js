import { useCallback, useEffect, useMemo, useState } from 'react'
import RequestStatusPicker from '@components/ValuePicker/RequestStatusPicker'
import Input from '@components/Input'
import { DEFAULT_REQUEST } from '@helpers/constants'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import requestSelector from '@state/selectors/requestSelector'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { postData } from '@helpers/CRUD'
import { useAtom, useAtomValue } from 'jotai'

const normalizeCancelReasons = (list = []) =>
  Array.from(
    new Set(
      (Array.isArray(list) ? list : [])
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  )

const requestStatusEditFunc = (requestId) => {
  const RequestStatusEditModal = ({
    closeModal,
    setOnConfirmFunc,
    setDisableConfirm,
    setConfirmButtonName,
  }) => {
    const request = useAtomValue(requestSelector(requestId))
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)

    const [status, setStatus] = useState(
      request?.status ?? DEFAULT_REQUEST.status
    )
    const [cancelReason, setCancelReason] = useState(
      request?.cancelReason ?? ''
    )
    const hasRequest = Boolean(requestId && request)
    const cancelReasons = useMemo(
      () => normalizeCancelReasons(siteSettings?.custom?.cancelReasons ?? []),
      [siteSettings?.custom?.cancelReasons]
    )
    const normalizedCancelReason = useMemo(
      () => (typeof cancelReason === 'string' ? cancelReason.trim() : ''),
      [cancelReason]
    )
    const needsCancelReason = status === 'canceled'
    const hasReasonChanged =
      normalizedCancelReason !== (request?.cancelReason ?? '')

    const handleConfirm = useCallback(async () => {
      if (!hasRequest) return
      closeModal()
      if (status === 'convert') {
        await itemsFunc?.request?.convert?.(request?._id)
        return
      }

      if (status !== request?.status || hasReasonChanged) {
        await itemsFunc?.request?.set(
          {
            _id: request?._id,
            status,
            cancelReason: needsCancelReason ? normalizedCancelReason : '',
          },
          false,
          true
        )
        if (needsCancelReason && normalizedCancelReason) {
          const nextReasons = normalizeCancelReasons([
            ...cancelReasons,
            normalizedCancelReason,
          ])
          if (nextReasons.length !== cancelReasons.length) {
            await postData(
              '/api/site',
              {
                custom: {
                  ...(siteSettings?.custom ?? {}),
                  cancelReasons: nextReasons,
                },
              },
              (data) => setSiteSettings(data),
              null,
              false,
              null
            )
          }
        }
      }
    }, [
      cancelReasons,
      closeModal,
      hasReasonChanged,
      hasRequest,
      itemsFunc,
      needsCancelReason,
      normalizedCancelReason,
      request?._id,
      request?.status,
      setSiteSettings,
      siteSettings?.custom,
      status,
    ])

    useEffect(() => {
      if (!hasRequest) return
      const isConvert = status === 'convert'
      const hasChanges =
        isConvert ||
        status !== request?.status ||
        hasReasonChanged ||
        (!needsCancelReason && Boolean(request?.cancelReason))

      setConfirmButtonName(isConvert ? 'Преобразовать' : 'Применить')
      setDisableConfirm(
        !hasChanges || (needsCancelReason && !normalizedCancelReason)
      )
      setOnConfirmFunc(hasChanges ? handleConfirm : undefined)
    }, [
      handleConfirm,
      hasReasonChanged,
      hasRequest,
      needsCancelReason,
      normalizedCancelReason,
      request?.cancelReason,
      request?.status,
      setConfirmButtonName,
      setDisableConfirm,
      setOnConfirmFunc,
      status,
    ])

    if (!hasRequest)
      return (
        <div className="flex w-full justify-center text-lg">
          ОШИБКА! Заявка не найдена!
        </div>
      )

    return (
      <div className="flex flex-col gap-y-3">
        <RequestStatusPicker
          status={status}
          onChange={setStatus}
          disableConvert={!!request.eventId}
          required
        />
        {needsCancelReason && (
          <Input
            label="Причина отмены"
            value={cancelReason}
            onChange={setCancelReason}
            dataList={{ name: 'cancel-reasons', list: cancelReasons }}
            required
            fullWidth
            noMargin
          />
        )}
        {request.eventId && (
          <div className="text-sm text-gray-500">
            Мероприятие по этой заявке уже создано, повторное преобразование
            недоступно.
          </div>
        )}
      </div>
    )
  }

  return {
    title: 'Изменение статуса заявки',
    confirmButtonName: 'Применить',
    showDecline: false,
    Children: RequestStatusEditModal,
  }
}

export default requestStatusEditFunc
