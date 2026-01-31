'use client'

import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { List, useListRef } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import EmptyState from '@components/EmptyState'
import HeaderActions from '@components/HeaderActions'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import RequestCardCompact from '@layouts/cards/RequestCardCompact'
import requestsAtom from '@state/atoms/requestsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom, modalsAtom } from '@state/atoms'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const ITEM_HEIGHT = 160

const RequestsRow = ({ index, style, requests, onEdit, onView, onStatusEdit }) => {
  const request = requests[index]
  if (!request) return null
  return (
    <RequestCardCompact
      style={style}
      request={request}
      onEdit={() => onEdit?.(request._id)}
      onView={() => onView?.(request._id)}
      onStatusEdit={(id) => onStatusEdit?.(id)}
    />
  )
}

const RequestsContent = () => {
  const requests = useAtomValue(requestsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const modals = useAtomValue(modalsAtom)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const listRef = useListRef()
  const openHandledRef = useRef(false)
  const [pendingOpenId, setPendingOpenId] = useState(null)
  const scrollTopRef = useRef(0)

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      }),
    [requests]
  )

  const handleEdit = useCallback(
    (id) => modalsFunc.request?.edit(id),
    [modalsFunc.request]
  )

  const handleView = useCallback(
    (id) => modalsFunc.request?.view(id),
    [modalsFunc.request]
  )

  const handleStatusEdit = useCallback(
    (id) => modalsFunc.request?.statusEdit(id),
    [modalsFunc.request]
  )

  const rowProps = useMemo(
    () => ({
      requests: sortedRequests,
      onEdit: handleEdit,
      onView: handleView,
      onStatusEdit: handleStatusEdit,
    }),
    [sortedRequests, handleEdit, handleView, handleStatusEdit]
  )

  useEffect(() => {
    if (modals.length === 0) {
      openHandledRef.current = false
    }
  }, [modals.length])

  useEffect(() => {
    const element = listRef.current?.element
    if (!element) return
    const handleScroll = () => {
      scrollTopRef.current = element.scrollTop
    }
    element.addEventListener('scroll', handleScroll)
    return () => element.removeEventListener('scroll', handleScroll)
  }, [listRef])

  useEffect(() => {
    const element = listRef.current?.element
    if (!element) return
    if (openHandledRef.current) return
    if (scrollTopRef.current > 0 && element.scrollTop === 0) {
      element.scrollTop = scrollTopRef.current
    }
  }, [sortedRequests])

  useEffect(() => {
    const urlTargetId = searchParams?.get('openRequest')
    if (!urlTargetId && !pendingOpenId && typeof window !== 'undefined') {
      const storedId = window.sessionStorage.getItem('openRequest')
      if (storedId) {
        const storedAt = Number(
          window.sessionStorage.getItem('openRequestAt') || 0
        )
        if (!storedAt || Date.now() - storedAt < 2 * 60 * 1000) {
          setPendingOpenId(storedId)
        }
        window.sessionStorage.removeItem('openRequest')
        window.sessionStorage.removeItem('openRequestAt')
      }
    }

    const targetId = urlTargetId || pendingOpenId
    if (!targetId) return
    let isActive = true
    let attempts = 0

    const scheduleRetry = () => {
      if (!isActive) return
      if (attempts >= 10) return
      attempts += 1
      setTimeout(tryOpen, 250)
    }

    const tryOpen = () => {
      if (!isActive) return
      if (openHandledRef.current) return
      if (!modalsFunc.request?.view) return scheduleRetry()
      if (!sortedRequests || sortedRequests.length === 0) return scheduleRetry()

      const index = sortedRequests.findIndex(
        (item) => String(item?._id) === String(targetId)
      )
      if (index === -1) return scheduleRetry()

      if (listRef.current?.scrollToRow) {
        listRef.current.scrollToRow({ index, align: 'center' })
      }
      setTimeout(() => {
        if (!isActive) return
        modalsFunc.request?.view(targetId)
        openHandledRef.current = true
        if (pendingOpenId) setPendingOpenId(null)
        if (pathname) router.replace(pathname, { scroll: false })
      }, 200)
    }

    tryOpen()
    return () => {
      isActive = false
    }
  }, [
    modalsFunc.request,
    pathname,
    router,
    searchParams,
    sortedRequests,
    pendingOpenId,
  ])

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions
          left={<div />}
          right={
            <>
              <MutedText>Всего: {requests.length}</MutedText>
              <Button
                name="+"
                collapsing
                className="action-icon-button h-9 w-9 rounded-full text-lg"
                onClick={() => modalsFunc.request?.add()}
                disabled={!modalsFunc.request?.add}
              />
            </>
          }
        />
      </ContentHeader>
      <SectionCard className="min-h-0 flex-1 overflow-hidden">
        {sortedRequests.length > 0 ? (
          <List
            listRef={listRef}
            rowCount={sortedRequests.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RequestsRow}
            rowProps={rowProps}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <EmptyState text="Заявок пока нет" bordered={false} />
        )}
      </SectionCard>
    </div>
  )
}

export default RequestsContent
