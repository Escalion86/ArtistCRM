'use client'

import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { List } from 'react-window'
import ContentHeader from '@components/ContentHeader'
import Button from '@components/Button'
import RequestCardCompact from '@layouts/cards/RequestCardCompact'
import requestsAtom from '@state/atoms/requestsAtom'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom, modalsAtom } from '@state/atoms'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const ITEM_HEIGHT = 160

const RequestsContent = () => {
  const requests = useAtomValue(requestsAtom)
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const modals = useAtomValue(modalsAtom)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const listRef = useRef(null)
  const openHandledRef = useRef(false)
  const [pendingOpenId, setPendingOpenId] = useState(null)

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      }),
    [requests]
  )

  const RowComponent = useCallback(
    ({ index, style }) => {
      const request = sortedRequests[index]
      return (
        <RequestCardCompact
          style={style}
          request={request}
          onEdit={() => modalsFunc.request?.edit(request._id)}
          onView={() => modalsFunc.request?.view(request._id)}
          onStatusEdit={(id) => modalsFunc.request?.statusEdit(id)}
        />
      )
    },
    [sortedRequests, modalsFunc.request]
  )

  useEffect(() => {
    if (modals.length === 0) {
      openHandledRef.current = false
    }
  }, [modals.length])

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

      listRef.current?.scrollToItem(index, 'center')
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
        <div className="flex flex-1 items-center justify-between">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Всего: {requests.length}</span>
            <Button
              name="+"
              collapsing
              className="action-icon-button h-9 w-9 rounded-full text-lg"
              onClick={() => modalsFunc.request?.add()}
              disabled={!modalsFunc.request?.add}
            />
          </div>
        </div>
      </ContentHeader>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {sortedRequests.length > 0 ? (
          <List
            ref={listRef}
            rowCount={sortedRequests.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={{}}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Заявок пока нет
          </div>
        )}
      </div>
    </div>
  )
}

export default RequestsContent
