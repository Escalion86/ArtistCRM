'use client'

import { useCallback } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
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
        <SectionCard className="flex flex-1 min-h-0 items-center justify-center">
          <EmptyState text="Доступно только администраторам" bordered={false} />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {tariffs.length}</MutedText>
              <Button
                name="+"
                collapsing
                className="text-lg rounded-full action-icon-button h-9 w-9"
                onClick={() => modalsFunc.tariff?.add()}
                disabled={!modalsFunc.tariff?.add}
              />
            </>
          }
        />
      </ContentHeader>
      <SectionCard className="flex-1 min-h-0 overflow-hidden">
        {sortedTariffs.length > 0 ? (
          <List
            rowCount={sortedTariffs.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={{}}
                                    style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <EmptyState text="Тарифы не настроены" bordered={false} />
        )}
      </SectionCard>
    </div>
  )
}

export default TariffsContent
