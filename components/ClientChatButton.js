'use client'

import { faComments } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import cn from 'classnames'
import { modalsFuncAtom } from '@state/atoms'
import { queryKeys } from '@helpers/queryKeys'
import { clearMessengerUnreadForClient } from '@helpers/messengerUnreadSummary'

const fetchMessengerSummary = async () => {
  const response = await fetch('/api/clients/messenger-summary')
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.success === false) {
    throw new Error(result?.error?.message || 'Не удалось загрузить чаты')
  }
  return result?.data
}

const UnreadBadge = ({ count }) => {
  if (count <= 0) return null
  return (
    <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white shadow-sm">
      {count > 99 ? '99+' : count}
    </span>
  )
}

const ClientChatButton = ({
  clientId,
  className,
  size = 'lg',
  withTitle = false,
}) => {
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: queryKeys.messengerSummary,
    queryFn: fetchMessengerSummary,
    enabled: Boolean(clientId),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  })

  const summary = data?.byClientId?.[String(clientId)]
  const conversationCount = Math.max(0, Number(summary?.conversationCount || 0))
  const unreadCount = Math.max(0, Number(summary?.unreadCount || 0))
  if (!clientId || conversationCount === 0) return null

  const openChat = (event) => {
    event.stopPropagation()
    queryClient.setQueryData(queryKeys.messengerSummary, (current) =>
      clearMessengerUnreadForClient(current, clientId)
    )
    modalsFunc.client?.messenger(clientId)
  }

  if (withTitle) {
    return (
      <button
        type="button"
        className={cn(
          'group flex cursor-pointer items-center gap-x-2 text-left',
          className
        )}
        onClick={openChat}
      >
        <div className="relative flex w-6 items-center justify-center">
          <FontAwesomeIcon
            icon={faComments}
            className="h-6 text-general duration-300 group-hover:scale-115 group-hover:text-toxic"
            size={size}
          />
          <UnreadBadge count={unreadCount} />
        </div>
        <span className="group-hover:text-toxic">Чат</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'relative flex h-6 w-6 cursor-pointer items-center justify-center text-general duration-300 hover:scale-110 hover:text-toxic',
        className
      )}
      onClick={openChat}
      title={
        unreadCount > 0
          ? `Непрочитанных сообщений: ${unreadCount}`
          : 'Открыть чат с клиентом'
      }
    >
      <FontAwesomeIcon icon={faComments} size={size} />
      <UnreadBadge count={unreadCount} />
    </button>
  )
}

export default ClientChatButton
