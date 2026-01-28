'use client'

import { useMemo, useCallback } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import ServiceCard from '@layouts/cards/ServiceCard'
import servicesAtom from '@state/atoms/servicesAtom'
import { modalsFuncAtom } from '@state/atoms'
import { useAtomValue } from 'jotai'

const ITEM_HEIGHT = 160

const ServicesContent = () => {
  const services = useAtomValue(servicesAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)

  const sortedServices = useMemo(
    () =>
      [...services].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', 'ru')
      ),
    [services]
  )

  const RowComponent = useCallback(
    ({ index, style }) => {
      const service = sortedServices[index]
      return <ServiceCard style={style} service={service} />
    },
    [sortedServices]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {services.length}</MutedText>
              <Button
                name="+"
                collapsing
                className="action-icon-button h-9 w-9 rounded-full text-lg"
                onClick={() => modalsFunc.service?.add()}
                disabled={!modalsFunc.service?.add}
              />
            </>
          }
        />
      </ContentHeader>
      <SectionCard className="min-h-0 flex-1 overflow-hidden">
        {sortedServices.length > 0 ? (
          <List
            rowCount={sortedServices.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={{}}
                                    style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <EmptyState text="Услуги не найдены" bordered={false} />
        )}
      </SectionCard>
    </div>
  )
}

export default ServicesContent
