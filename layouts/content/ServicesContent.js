'use client'

import { useMemo, useState } from 'react'
import ContentHeader from '@components/ContentHeader'
import AddIconButton from '@components/AddIconButton'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import ServiceCard from '@layouts/cards/ServiceCard'
import { modalsFuncAtom } from '@state/atoms'
import serviceGroupsAtom from '@state/atoms/serviceGroupsAtom'
import { useAtomValue } from 'jotai'
import { useServicesQuery } from '@helpers/useEntityQueries'
import cn from 'classnames'

const ChevronIcon = ({ open }) => (
  <svg
    className={cn(
      'h-4 w-4 text-gray-400 transition-transform',
      open && 'rotate-90'
    )}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
)

const ServicesContent = () => {
  const { data: services = [] } = useServicesQuery()
  const serviceGroups = useAtomValue(serviceGroupsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [expandedGroups, setExpandedGroups] = useState({})

  const hasGroups = serviceGroups.length > 0

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // Group services and sort
  const groupedData = useMemo(() => {
    if (!hasGroups) {
      // No groups — flat sorted list
      return {
        isGrouped: false,
        flatList: [...services].sort((a, b) =>
          (a.title || '').localeCompare(b.title || '', 'ru')
        ),
      }
    }

    // Group services
    const grouped = {}
    const withoutGroup = []

    services.forEach((service) => {
      if (service?.groupId) {
        const gId = service.groupId
        if (!grouped[gId]) grouped[gId] = []
        grouped[gId].push(service)
      } else {
        withoutGroup.push(service)
      }
    })

    // Sort services inside groups
    Object.keys(grouped).forEach((gId) => {
      grouped[gId].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', 'ru')
      )
    })

    // Sort services without group
    const sortedWithoutGroup = [...withoutGroup].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'ru')
    )

    // Sort groups by order
    const sortedGroups = [...serviceGroups].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    )

    return {
      isGrouped: true,
      groups: sortedGroups,
      grouped,
      withoutGroup: sortedWithoutGroup,
      allCount: services.length,
    }
  }, [services, serviceGroups, hasGroups])

  if (!hasGroups) {
    // Flat list (no groups)
    const flatList = groupedData.flatList || []
    return (
      <div className="flex flex-col h-full gap-4">
        <ContentHeader>
          <HeaderActions
            left={<div />}
            right={
              <>
                <MutedText>Всего: {services.length}</MutedText>
                <AddIconButton
                  onClick={() => modalsFunc.service?.add()}
                  disabled={!modalsFunc.service?.add}
                  title="Добавить услугу"
                  size="sm"
                  variant="neutral"
                />
              </>
            }
          />
        </ContentHeader>
        <SectionCard className="flex-1 min-h-0">
          <div className="flex flex-col h-full gap-2 p-4 overflow-y-auto">
            {flatList.length > 0 ? (
              flatList.map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))
            ) : (
              <EmptyState text="Услуги не найдены" bordered={false} />
            )}
          </div>
        </SectionCard>
      </div>
    )
  }

  // Tree view with groups
  const { groups, grouped, withoutGroup } = groupedData
  const hasServicesInGroups = groups.some(
    (g) => (grouped[g._id]?.length || 0) > 0
  )

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {services.length}</MutedText>
              <AddIconButton
                onClick={() => modalsFunc.service?.add()}
                disabled={!modalsFunc.service?.add}
                title="Добавить услугу"
                size="sm"
                variant="neutral"
              />
            </>
          }
        />
      </ContentHeader>
      <SectionCard className="flex-1 min-h-0">
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          {/* Services without group */}
          {withoutGroup.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('__without_group')}
                className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
              >
                <ChevronIcon
                  open={expandedGroups['__without_group'] !== false}
                />
                <span>Без группы</span>
                <span className="text-xs font-normal text-gray-400">
                  ({withoutGroup.length})
                </span>
              </button>
              {expandedGroups['__without_group'] !== false && (
                <div className="flex flex-col gap-2 pl-5 mt-2">
                  {withoutGroup.map((service) => (
                    <ServiceCard key={service._id} service={service} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Groups with services */}
          {groups.map((group) => {
            const servicesInGroup = grouped[group._id] || []
            if (servicesInGroup.length === 0) return null
            const isExpanded = expandedGroups[group._id] !== false

            return (
              <div key={group._id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group._id)}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  <ChevronIcon open={isExpanded} />
                  <span>{group.title}</span>
                  <span className="text-xs font-normal text-gray-400">
                    ({servicesInGroup.length})
                  </span>
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-2 pl-5 mt-2">
                    {servicesInGroup.map((service) => (
                      <ServiceCard key={service._id} service={service} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {!hasServicesInGroups && withoutGroup.length === 0 && (
            <EmptyState text="Услуги не найдены" bordered={false} />
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default ServicesContent
