'use client'

import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import HeaderActions from '@components/HeaderActions'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { modalsFuncAtom } from '@state/atoms'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'

const normalizeTowns = (towns = []) =>
  Array.from(
    new Set(
      towns
        .map((town) => (typeof town === 'string' ? town.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'))

const normalizeEventTypes = (eventTypes = []) =>
  Array.from(
    new Set(
      eventTypes
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'))

const ListsContent = () => {
  const siteSettings = useAtomValue(siteSettingsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)

  const townsOptions = useMemo(
    () => normalizeTowns(siteSettings?.towns ?? []),
    [siteSettings?.towns]
  )
  const eventTypes = useMemo(
    () => normalizeEventTypes(siteSettings?.custom?.eventTypes ?? []),
    [siteSettings?.custom?.eventTypes]
  )

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions left={<div />} right={<div />} />
      </ContentHeader>
      <SectionCard className="flex flex-col flex-1 min-h-0 gap-4 p-4 overflow-y-auto">
        <div className="flex flex-col w-full gap-3">
          <div className="flex items-center justify-between w-full gap-3 p-3 border border-gray-200 rounded">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-gray-900">Города</div>
              <MutedText>
                По умолчанию:{' '}
                <span className="font-semibold text-gray-900">
                  {siteSettings?.defaultTown || 'Не выбран'}
                </span>
              </MutedText>
              <MutedText className="text-gray-500">
                Элементов: {townsOptions.length}
              </MutedText>
            </div>
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded cursor-pointer action-icon-button action-icon-button--warning"
              onClick={() => modalsFunc.settings?.towns?.()}
              title="Редактировать города"
            >
              <FontAwesomeIcon className="w-5 h-5" icon={faPencilAlt} />
            </button>
          </div>
          <div className="flex items-center justify-between w-full gap-3 p-3 border border-gray-200 rounded">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-gray-900">
                Что за мероприятие?
              </div>
              <MutedText className="text-gray-500">
                Элементов: {eventTypes.length}
              </MutedText>
            </div>
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded cursor-pointer action-icon-button action-icon-button--warning"
              onClick={() => modalsFunc.settings?.eventTypes?.()}
              title="Редактировать список мероприятий"
            >
              <FontAwesomeIcon className="w-5 h-5" icon={faPencilAlt} />
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default ListsContent
