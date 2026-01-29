import LoadingSpinner from '@components/LoadingSpinner'
import HistoryItem from '@components/HistoryItem'
import { getData } from '@helpers/CRUD'
import compareObjectsWithDif from '@helpers/compareObjectsWithDif'
import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import RequestKeyValueItem from './historyKeyValuesItems/RequestKeyValueItem'
import { requestKeys } from './historyKeyValuesItems/keys'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { modalsFuncAtom } from '@state/atoms'
import dateToDateTimeStr from '@helpers/dateToDateTimeStr'
import requestSelector from '@state/selectors/requestSelector'
import formatAddress from '@helpers/formatAddress'
import formatDate from '@helpers/formatDate'

const requestHistoryFunc = (requestId) => {
  const RequestHistoryModal = () => {
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const request = useAtomValue(requestSelector(requestId))
    const [requestHistory, setRequestHistory] = useState()
    const setRequest = useAtomValue(itemsFuncAtom).request.set
    const hasRequest = Boolean(request && requestId)

    useEffect(() => {
      if (!hasRequest) return
      const fetchData = async () => {
        const result = await getData(`/api/histories`, {
          schema: 'requests',
          'data._id': requestId,
        })
        setRequestHistory(result)
      }
      fetchData().catch(console.error)
    }, [requestId, hasRequest])

    if (!hasRequest)
      return (
        <div className="flex justify-center w-full text-lg">
          ОШИБКА! Заявка не найдена!
        </div>
      )

    const requestTitle = request?.createdAt
      ? formatDate(request.createdAt, false, true)
      : 'Заявка'
    const requestAddress = formatAddress(
      request?.address,
      request?.location || 'Адрес не указан'
    )

    return (
      <div className="flex flex-col items-center flex-1 gap-y-2">
        <div className="text-lg font-bold">{requestTitle}</div>
        <div className="text-sm text-gray-600">{requestAddress}</div>
        {requestHistory ? (
          <div className="flex flex-col-reverse w-full gap-y-1">
            {requestHistory.length === 0
              ? 'Нет записей'
              : requestHistory.map(
                  (
                    { action, data, userId, createdAt, _id, difference },
                    index
                  ) => {
                    const changes = difference
                      ? data[0]
                      : compareObjectsWithDif(
                          index > 0 ? requestHistory[index - 1].data[0] : {},
                          data[0]
                        )
                    const redoChanges = {}
                    for (let i = requestHistory.length - 1; i >= index; i--) {
                      const { data, difference } = requestHistory[i]
                      const changes = difference
                        ? data[0]
                        : compareObjectsWithDif(
                            index > 0 ? requestHistory[index - 1].data[0] : {},
                            data[0]
                          )
                      Object.keys(changes).forEach((key) => {
                        redoChanges[key] =
                          i === index ? changes[key].new : changes[key].old
                      })
                    }

                    return (
                      <HistoryItem
                        key={_id}
                        action={action}
                        changes={changes}
                        createdAt={createdAt}
                        userId={userId}
                        keys={requestKeys}
                        KeyValueItem={RequestKeyValueItem}
                        onClickRedo={() =>
                          modalsFunc.confirm({
                            title: 'Откат изменений заявки',
                            text:
                              'Подтверждение отката внесет изменения в заявку, преведя ее к виду на момент последнего изменения от ' +
                              dateToDateTimeStr(createdAt, true, false),
                            onConfirm: () =>
                              setRequest({ ...redoChanges, _id: request._id }),
                          })
                        }
                      />
                    )
                  }
                )}
          </div>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    )
  }

  return {
    title: `История изменений заявки`,
    Children: RequestHistoryModal,
    declineButtonName: 'Закрыть',
    showDecline: true,
  }
}

export default requestHistoryFunc
