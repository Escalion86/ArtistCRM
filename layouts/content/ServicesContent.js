'use client'

import { useMemo, useCallback } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
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
        <div className="flex flex-1 items-center justify-between">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Всего: {services.length}</span>
            <Button
              name="+"
              collapsing
              className="action-icon-button h-9 w-9 rounded-full text-lg"
              onClick={() => modalsFunc.service?.add()}
              disabled={!modalsFunc.service?.add}
            />
          </div>
        </div>
      </ContentHeader>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {sortedServices.length > 0 ? (
          <List
            rowCount={sortedServices.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            defaultHeight={400}
            defaultWidth={800}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Услуги не найдены
          </div>
        )}
      </div>
    </div>
  )
}

export default ServicesContent
