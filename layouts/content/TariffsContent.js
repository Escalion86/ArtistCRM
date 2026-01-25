'use client'

import { useCallback } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import TariffCard from '@layouts/cards/TariffCard'
import { modalsFuncAtom } from '@state/atoms'
import loggedUserActiveRoleSelector from '@state/selectors/loggedUserActiveRoleSelector'
import tariffsAtom from '@state/atoms/tariffsAtom'
import { useAtomValue } from 'jotai'

const ITEM_HEIGHT = 156

const TariffsContent = () => {
  const tariffs = useAtomValue(tariffsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const loggedUserActiveRole = useAtomValue(loggedUserActiveRoleSelector)
  const canEdit =
    loggedUserActiveRole?.dev || loggedUserActiveRole?.users?.setRole

  const sortedTariffs = [...tariffs].sort((a, b) => {
    const priceDiff = (a.price ?? 0) - (b.price ?? 0)
    if (priceDiff !== 0) return priceDiff
    return (a.title || '').localeCompare(b.title || '', 'ru')
  })

  const RowComponent = useCallback(
    ({ index, style }) => {
      const tariff = sortedTariffs[index]
      return (
        <TariffCard
          style={style}
          tariff={tariff}
          onEdit={() => modalsFunc.tariff?.edit(tariff._id)}
          onDelete={() => modalsFunc.tariff?.delete(tariff._id)}
        />
      )
    },
    [modalsFunc.tariff, sortedTariffs]
  )

  if (!canEdit) {
    return (
      <div className="flex flex-col h-full gap-4">
        <ContentHeader />
        <div className="flex items-center justify-center flex-1 min-h-0 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          Доступно только администраторам
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <div className="flex items-center justify-between flex-1">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Всего: {tariffs.length}</span>
            <Button
              name="+"
              collapsing
              className="text-lg rounded-full action-icon-button h-9 w-9"
              onClick={() => modalsFunc.tariff?.add()}
              disabled={!modalsFunc.tariff?.add}
            />
          </div>
        </div>
      </ContentHeader>
      <div className="flex-1 min-h-0 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        {sortedTariffs.length > 0 ? (
          <List
            rowCount={sortedTariffs.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            defaultHeight={400}
            defaultWidth={800}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Тарифы не настроены
          </div>
        )}
      </div>
    </div>
  )
}

export default TariffsContent
