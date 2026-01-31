import EventStatusPicker from '@components/ValuePicker/EventStatusPicker'
import Input from '@components/Input'
import { DEFAULT_EVENT } from '@helpers/constants'
// import isEventExpiredFunc from '@helpers/isEventExpired'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import eventSelector from '@state/selectors/eventSelector'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
// import expectedIncomeOfEventSelector from '@state/selectors/expectedIncomeOfEventSelector'
// import totalIncomeOfEventSelector from '@state/selectors/totalIncomeOfEventSelector'
import { postData } from '@helpers/CRUD'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'

const normalizeCancelReasons = (list = []) =>
  Array.from(
    new Set(
      (Array.isArray(list) ? list : [])
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  )

const eventStatusEditFunc = (eventId) => {
  const EventStatusEditModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
    setTopLeftComponent,
  }) => {
    const event = useAtomValue(eventSelector(eventId))
    const setEvent = useAtomValue(itemsFuncAtom).event.set
    const transactions = useAtomValue(transactionsAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    // const isEventExpired = isEventExpiredFunc(event)

    // const totalIncome = useAtomValue(totalIncomeOfEventSelector(eventId))
    // const expectedIncome = useAtomValue(
    //   expectedIncomeOfEventSelector(eventId)
    // )
    // const canSetClosed = totalIncome >= expectedIncome && isEventExpired

    const [status, setStatus] = useState(event?.status ?? DEFAULT_EVENT.status)
    const [cancelReason, setCancelReason] = useState(
      event?.cancelReason ?? ''
    )
    const incomeTotal = useMemo(
      () =>
        (transactions ?? [])
          .filter(
            (transaction) =>
              transaction.eventId === eventId && transaction.type === 'income'
          )
          .reduce((total, item) => total + (item.amount ?? 0), 0),
      [eventId, transactions]
    )
    const contractSum = event?.contractSum ?? 0
    const hasTaxes = useMemo(
      () =>
        (transactions ?? []).some(
          (transaction) =>
            transaction.eventId === eventId &&
            transaction.category === 'taxes'
        ),
      [eventId, transactions]
    )
    const canClose =
      incomeTotal >= contractSum && (!event?.isByContract || hasTaxes)
    const statusDisabledValues = useMemo(() => {
      if (status === 'closed') return []
      if (!canClose) return ['closed']
      return []
    }, [canClose, status])
    const hasEvent = Boolean(event && eventId)
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
      normalizedCancelReason !== (event?.cancelReason ?? '')

    const onClickConfirm = async () => {
      closeModal()
      setEvent({
        _id: event?._id,
        status,
        cancelReason: needsCancelReason ? normalizedCancelReason : '',
      })
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

    const onClickConfirmRef = useRef(onClickConfirm)

    useEffect(() => {
      onClickConfirmRef.current = onClickConfirm
    }, [onClickConfirm])

    useEffect(() => {
      if (!hasEvent) return
      const isFormChanged =
        event?.status !== status ||
        hasReasonChanged ||
        (!needsCancelReason && Boolean(event?.cancelReason))
      setDisableConfirm(
        !isFormChanged || (needsCancelReason && !normalizedCancelReason)
      )
      setOnConfirmFunc(
        isFormChanged ? () => onClickConfirmRef.current() : undefined
      )
    }, [
      event?.cancelReason,
      event?.status,
      hasEvent,
      hasReasonChanged,
      needsCancelReason,
      normalizedCancelReason,
      setDisableConfirm,
      setOnConfirmFunc,
      status,
    ])

    if (!hasEvent)
      return (
        <div className="flex w-full justify-center text-lg ">
          ОШИБКА! Мероприятие не найдено!
        </div>
      )

    return (
      <div className="flex flex-col gap-y-2">
        <EventStatusPicker
          required
          status={status}
          onChange={setStatus}
          disabledValues={statusDisabledValues}
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
        {!canClose && (
          <div className="text-xs text-gray-500">
            {event?.isByContract && !hasTaxes
              ? 'Закрытие недоступно: добавьте транзакцию Налоги.'
              : 'Закрытие недоступно, пока сумма поступлений меньше договорной.'}
          </div>
        )}
        {/* {!canSetClosed && (
          <>
            <div className="text-red-500">
              Закрытие мероприятия не доступно так как:
            </div>
            <ul className="ml-4 -mt-2 list-disc">
              {totalIncome < expectedIncome && (
                <li className="text-red-500">
                  финансы мероприятия не полностью заполнены
                </li>
              )}
              {!isEventExpired && (
                <li className="text-red-500">мероприятие не завершено</li>
              )}
            </ul>
          </>
        )} */}
      </div>
    )
  }

  return {
    title: `Редактирование статуса мероприятия`,
    confirmButtonName: 'Применить',
    Children: EventStatusEditModal,
    // TopLeftComponent: () => (
    //   <CardButtons
    //     item={{ _id: eventId }}
    //     typeOfItem="event"
    //     forForm
    //     direction="right"
    //   />
    // ),
  }
}

export default eventStatusEditFunc
