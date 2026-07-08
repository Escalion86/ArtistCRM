import { useAtom, useSetAtom } from 'jotai'

import eventsAtom from '@state/atoms/eventsAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import servicesAtom from '@state/atoms/servicesAtom'
import serviceGroupsAtom from '@state/atoms/serviceGroupsAtom'
import usersAtom from '@state/atoms/usersAtom'
import tariffsAtom from '@state/atoms/tariffsAtom'
import { useEffect, useRef } from 'react'
import LoadingSpinner from '@components/LoadingSpinner'
import ModalsPortal from '@layouts/modals/ModalsPortal'
import isSiteLoadingAtom from '@state/atoms/isSiteLoadingAtom'
import cn from 'classnames'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useWindowDimensionsRecoil } from '@helpers/useWindowDimensions'
import { modalsFuncAtom } from '@state/atoms'
import modalsFuncGenerator from '@layouts/modals/modalsFuncGenerator'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import itemsFuncGenerator from '@state/itemsFuncGenerator'
import useSnackbar from '@helpers/useSnackbar'
import { getUserTariffAccess } from '@helpers/tariffAccess'
import { pages } from '@helpers/constants'
import isPageAllowedForRole from '@helpers/pageAccess'
import {
  readServerSyncDisabledFromStorage,
  resolveServerSyncDisabled,
} from '@helpers/serverSyncMode'
import {
  appendServerSyncQueueItem,
  getReadyServerSyncQueueItems,
  getServerSyncQueueSummary,
  markServerSyncQueueItemConflict,
  markServerSyncQueueItemFailed,
  markServerSyncQueueItemSynced,
  markServerSyncQueueItemSyncing,
  readServerSyncQueue,
  replaceServerSyncQueue,
  SERVER_SYNC_FLUSH_NOW_EVENT,
  updateServerSyncQueueItem,
} from '@helpers/serverSyncQueue'
import { sendClientLog } from '@helpers/clientLog'
import { queryKeys } from '@helpers/queryKeys'
import { useEventActions } from '@helpers/useEventsQuery'
import { useClientActions } from '@helpers/useClientsQuery'
import { useServiceGroupActions } from '@helpers/useEntityQueries'
import { isPushSupported, syncPushSubscription } from '@helpers/pushClient'
import useCabinetPerformanceMetrics from '@helpers/useCabinetPerformanceMetrics'
import { shouldOpenFirstRunWizard } from '@helpers/firstRunWizard.mjs'

const StateLoader = (props) => {
  if (props.error && Object.keys(props.error).length > 0)
    console.log('props.error', props.error)

  const snackbar = useSnackbar()

  const router = useRouter()
  const queryClient = useQueryClient()

  const [modalFunc, setModalsFunc] = useAtom(modalsFuncAtom)

  const [isSiteLoading, setIsSiteLoading] = useAtom(isSiteLoadingAtom)

  // const [mode, setMode] = useAtom(modeAtom)

  const [loggedUser, setLoggedUser] = useAtom(loggedUserAtom)

  const setEventsState = useSetAtom(eventsAtom)
  const setClientsState = useSetAtom(clientsAtom)
  const setTransactionsState = useSetAtom(transactionsAtom)
  const [siteSettingsState, setSiteSettingsState] = useAtom(siteSettingsAtom)
  const setUsersState = useSetAtom(usersAtom)
  // const setRolesSettingsState = useSetAtom(rolesAtom)
  // const setHistoriesState = useSetAtom(historiesAtom)
  // const setQuestionnairesState = useSetAtom(questionnairesAtom)
  // const setQuestionnairesUsersState = useSetAtom(questionnairesUsersAtom)
  const setServicesState = useSetAtom(servicesAtom)
  const setServiceGroupsState = useSetAtom(serviceGroupsAtom)
  const setTariffsState = useSetAtom(tariffsAtom)
  // const setServicesUsersState = useSetAtom(servicesUsersAtom)
  // const setServerSettingsState = useSetAtom(serverSettingsAtom)

  const setItemsFunc = useSetAtom(itemsFuncAtom)
  const serverSyncDisabled = resolveServerSyncDisabled(siteSettingsState)
  const eventActions = useEventActions()
  const clientActions = useClientActions()
  const serviceGroupActions = useServiceGroupActions()

  useWindowDimensionsRecoil()

  const customSettings = siteSettingsState?.custom
  const isTenantPushEnabled =
    (typeof customSettings?.get === 'function'
      ? customSettings.get('publicLeadPushEnabled')
      : customSettings?.publicLeadPushEnabled) === true

  useCabinetPerformanceMetrics({
    page: props.page,
    events: props.events,
    clients: props.clients,
    transactions: props.transactions,
    services: props.services,
    tariffs: props.tariffs,
    users: props.users,
    eventsPaging: props.eventsPaging,
    isSiteLoading,
  })

  useEffect(() => {
    const itemsFunc = itemsFuncGenerator(snackbar, loggedUser, {
      disableServerSync: serverSyncDisabled,
      eventActions,
      clientActions,
      serviceGroupActions,
    })
    setItemsFunc(itemsFunc)
    setModalsFunc(
      modalsFuncGenerator(
        router,
        itemsFunc,
        loggedUser,
        { disableServerSync: serverSyncDisabled }
        // loggedUser,
        // siteSettingsState,
      )
    )
  }, [
    loggedUser,
    clientActions,
    eventActions,
    router,
    serverSyncDisabled,
    serviceGroupActions,
    setItemsFunc,
    setModalsFunc,
    snackbar,
  ])

  useEffect(() => {
    setLoggedUser(props.loggedUser)
    setEventsState(props.events)
    setClientsState(props.clients)
    setTransactionsState(props.transactions ?? [])
    setServicesState(props.services ?? [])
    setTariffsState(props.tariffs ?? [])
    setUsersState(props.users ?? [])
    setSiteSettingsState(props.siteSettings)
    const eventsScope =
      props.eventsPaging?.scope && props.eventsPaging.scope !== 'none'
        ? props.eventsPaging.scope
        : props.page === 'eventsUpcoming'
          ? 'upcoming'
          : props.page === 'eventsPast'
            ? 'past'
            : 'all'
    const eventsQueryPayload = {
      data: props.events ?? [],
      meta: props.eventsPaging ?? {},
    }
    queryClient.setQueryData(
      queryKeys.events({ scope: eventsScope }),
      eventsQueryPayload
    )
    queryClient.setQueryData(
      queryKeys.events({ scope: 'all' }),
      eventsQueryPayload
    )
    ;(props.events ?? []).forEach((event) => {
      if (event?._id)
        queryClient.setQueryData(queryKeys.event(event._id), event)
    })
    queryClient.setQueryData(queryKeys.clients(), props.clients ?? [])
    queryClient.setQueryData(
      queryKeys.transactionsAll,
      props.transactions ?? []
    )
    queryClient.setQueryData(queryKeys.services(), props.services ?? [])
    queryClient.setQueryData(queryKeys.tariffs(), props.tariffs ?? [])
    queryClient.setQueryData(queryKeys.users(), props.users ?? [])
    queryClient.setQueryData(queryKeys.siteSettings, props.siteSettings ?? {})
    if (props.loggedUser) {
      queryClient.setQueryData(queryKeys.loggedUser, props.loggedUser)
    }
    queryClient.setQueryData(queryKeys.statistics(), {
      events: props.events ?? [],
      clients: props.clients ?? [],
      services: props.services ?? [],
      transactions: props.transactions ?? [],
      filters: {},
    })
    setIsSiteLoading(false)
  }, [
    props.clients,
    props.events,
    props.eventsPaging,
    props.loggedUser,
    props.page,
    props.siteSettings,
    props.services,
    props.tariffs,
    props.transactions,
    props.users,
    queryClient,
    setClientsState,
    setEventsState,
    setIsSiteLoading,
    setLoggedUser,
    setServicesState,
    setTariffsState,
    setUsersState,
    setSiteSettingsState,
    setTransactionsState,
  ])

  // Load service groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await fetch('/api/service-groups')
        const result = await response.json()
        if (result?.success && Array.isArray(result.data)) {
          setServiceGroupsState(result.data)
        }
      } catch {
        // silently fail
      }
    }
    loadGroups()
  }, [setServiceGroupsState])

  useEffect(() => {
    if (!loggedUser?._id) return
    if (!isPushSupported()) return
    if (Notification.permission !== 'granted') return
    if (!isTenantPushEnabled) return

    let cancelled = false

    const syncCurrentPushSubscription = async () => {
      try {
        if (cancelled) return
        await syncPushSubscription({
          ensureLocalSubscription: true,
        }).catch(() => null)
      } catch (error) {
        // Silent sync: user can still manage push manually from settings.
      }
    }

    syncCurrentPushSubscription()

    return () => {
      cancelled = true
    }
  }, [isTenantPushEnabled, loggedUser?._id])

  useEffect(() => {
    if (!loggedUser?._id) return
    const access = getUserTariffAccess(loggedUser, props.tariffs ?? [])
    const needsTariff = !access.trialActive && !access.hasTariff
    const allowedPages = ['tariff-select', 'tariffs']
    if (needsTariff && props.page && !allowedPages.includes(props.page)) {
      router.push('/cabinet/tariff-select')
    }
  }, [
    loggedUser,
    loggedUser?._id,
    loggedUser?.tariffId,
    props.page,
    props.tariffs,
    router,
  ])

  const onboardingShownRef = useRef(false)
  const privacyWarningShownRef = useRef(false)
  const syncFlushInProgressRef = useRef(false)
  const startupErrorLoggedRef = useRef(false)

  useEffect(() => {
    if (!props.error || startupErrorLoggedRef.current) return
    startupErrorLoggedRef.current = true
    sendClientLog({
      type: 'cabinet-props-error',
      page: props.page,
      message:
        typeof props.error?.message === 'string'
          ? props.error.message
          : 'unknown',
      name: props.error?.name,
      code: props.error?.code,
      digest: props.error?.digest,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      hasLoggedUser: Boolean(props.loggedUser?._id),
      hasEvents: Array.isArray(props.events),
      eventsCount: Array.isArray(props.events) ? props.events.length : null,
    })
  }, [props.error, props.events, props.loggedUser?._id, props.page])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const nativeFetch = window.fetch.bind(window)

    const getMethod = (input, init) =>
      String(
        init?.method ??
          (typeof input === 'object' && input ? input.method : 'GET') ??
          'GET'
      ).toUpperCase()

    const normalizeBody = (body) => {
      if (!body) return ''
      if (typeof body === 'string') return body
      if (body instanceof URLSearchParams) return body.toString()
      if (body instanceof FormData) return '[form-data]'
      if (body instanceof Blob || body instanceof ArrayBuffer) return '[binary]'
      try {
        return JSON.stringify(body)
      } catch (error) {
        return '[unserializable]'
      }
    }

    const normalizeHeaders = (headersValue) => {
      if (!headersValue) return {}
      if (headersValue instanceof Headers) {
        return Object.fromEntries(headersValue.entries())
      }
      if (Array.isArray(headersValue)) {
        return Object.fromEntries(headersValue)
      }
      if (typeof headersValue === 'object') {
        return { ...headersValue }
      }
      return {}
    }

    const hasReplayHeader = (headersValue) => {
      const headers = normalizeHeaders(headersValue)
      return Object.entries(headers).some(
        ([key, value]) =>
          key.toLowerCase() === 'x-artistcrm-sync-replay' &&
          String(value) === '1'
      )
    }

    const isQueueableWrite = (input, init) => {
      const method = getMethod(input, init)
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return false
      if (hasReplayHeader(init?.headers)) return false

      const inputUrl =
        typeof input === 'string'
          ? input
          : typeof input?.url === 'string'
            ? input.url
            : ''
      if (!inputUrl) return false

      const url = new URL(inputUrl, window.location.origin)
      const isSameOriginApi =
        url.origin === window.location.origin &&
        url.pathname.startsWith('/api/')
      if (!isSameOriginApi) return false

      if (url.pathname.startsWith('/api/auth/')) return false

      return true
    }

    const queueWrite = (input, init, reason = '') => {
      const method = getMethod(input, init)
      const inputUrl =
        typeof input === 'string'
          ? input
          : typeof input?.url === 'string'
            ? input.url
            : ''
      const url = new URL(inputUrl, window.location.origin)

      appendServerSyncQueueItem({
        id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        url: `${url.pathname}${url.search}`,
        method,
        body: normalizeBody(init?.body),
        headers: normalizeHeaders(init?.headers),
        createdAt: new Date().toISOString(),
        lastError: reason,
      })
    }

    const queuedResponse = () =>
      new Response(
        JSON.stringify({
          success: true,
          data: null,
          localOnly: true,
          queued: true,
        }),
        {
          status: 202,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

    window.fetch = async (input, init = {}) => {
      const queueableWrite = isQueueableWrite(input, init)
      const disabledFromStorage = readServerSyncDisabledFromStorage()
      const disabled =
        typeof disabledFromStorage === 'boolean'
          ? disabledFromStorage
          : serverSyncDisabled

      if (queueableWrite && disabled) {
        queueWrite(input, init, 'server_sync_disabled')

        if (!privacyWarningShownRef.current) {
          snackbar.warning(
            'Серверная синхронизация отключена: запрос сохранен локально'
          )
          privacyWarningShownRef.current = true
        }

        return queuedResponse()
      }

      if (queueableWrite && navigator && navigator.onLine === false) {
        queueWrite(input, init, 'offline')
        snackbar.warning('Нет сети: изменение сохранено и будет синхронизировано')
        return queuedResponse()
      }

      try {
        return await nativeFetch(input, init)
      } catch (error) {
        if (!queueableWrite) throw error

        queueWrite(input, init, error?.message || 'network_error')
        snackbar.warning('Нет связи: изменение сохранено и будет синхронизировано')
        return queuedResponse()
      }
    }

    return () => {
      window.fetch = nativeFetch
    }
  }, [serverSyncDisabled, snackbar])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const flushQueue = async () => {
      if (syncFlushInProgressRef.current) return
      if (serverSyncDisabled) return
      if (!navigator.onLine) return

      const initialQueue = readServerSyncQueue()
      if (initialQueue.length === 0) return

      const initialSummary = getServerSyncQueueSummary(initialQueue)
      if (initialSummary.ready === 0) return

      syncFlushInProgressRef.current = true
      try {
        let processed = 0
        let failed = 0
        let conflicts = 0

        while (true) {
          const queue = readServerSyncQueue()
          const readyItems = getReadyServerSyncQueueItems(queue)
          const item = readyItems[0]
          if (!item) break

          updateServerSyncQueueItem(item.id, (current) =>
            markServerSyncQueueItemSyncing(current)
          )

          const method = String(item?.method || 'POST').toUpperCase()
          const body =
            typeof item?.body === 'string' &&
            item.body !== '[form-data]' &&
            item.body !== '[binary]' &&
            item.body !== '[unserializable]'
              ? item.body
              : undefined
          const headers =
            item?.headers && typeof item.headers === 'object'
              ? { ...item.headers }
              : { 'Content-Type': 'application/json' }
          headers['x-artistcrm-sync-replay'] = '1'

          try {
            const response = await fetch(item.url, {
              method,
              headers,
              body,
            })

            if (response.ok) {
              processed += 1
              updateServerSyncQueueItem(item.id, (current) =>
                markServerSyncQueueItemSynced(current)
              )
              continue
            }

            if (response.status === 409) {
              conflicts += 1
              updateServerSyncQueueItem(item.id, (current) =>
                markServerSyncQueueItemConflict(
                  current,
                  `HTTP ${response.status}`
                )
              )
              break
            }

            failed += 1
            updateServerSyncQueueItem(item.id, (current) =>
              markServerSyncQueueItemFailed(current, `HTTP ${response.status}`)
            )
            break
          } catch (error) {
            failed += 1
            updateServerSyncQueueItem(item.id, (current) =>
              markServerSyncQueueItemFailed(current, error)
            )
            break
          }
        }

        replaceServerSyncQueue(readServerSyncQueue())

        if (processed > 0) {
          queryClient.invalidateQueries()
          snackbar.success(`Синхронизировано локальных изменений: ${processed}`)
        }

        if (conflicts > 0) {
          snackbar.warning(
            'Есть конфликт синхронизации. Проверьте блок "Синхронизация".'
          )
        } else if (failed > 0) {
          snackbar.warning(
            'Не удалось синхронизировать часть очереди. Повторим позже.'
          )
        }
      } catch (error) {
        snackbar.warning('Синхронизация очереди прервана')
      } finally {
        syncFlushInProgressRef.current = false
      }
    }

    const handleOnline = () => {
      flushQueue()
    }
    const handleManualFlush = () => {
      flushQueue()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener(SERVER_SYNC_FLUSH_NOW_EVENT, handleManualFlush)

    flushQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(SERVER_SYNC_FLUSH_NOW_EVENT, handleManualFlush)
    }
  }, [queryClient, serverSyncDisabled, snackbar])

  useEffect(() => {
    const shouldOpen = shouldOpenFirstRunWizard({
      loggedUser,
      siteSettings: siteSettingsState,
      alreadyShown: onboardingShownRef.current,
    })

    if (shouldOpen && modalFunc?.user?.firstRunWizard) {
      onboardingShownRef.current = true
      modalFunc.user.firstRunWizard()
    }
  }, [
    loggedUser,
    siteSettingsState,
    siteSettingsState?.custom?.firstRunWizardCompleted,
    siteSettingsState?.custom?.firstRunWizardShowToken,
    modalFunc,
  ])

  useEffect(() => {
    if (!loggedUser?._id || !props.page) return
    const role = loggedUser?.role ?? 'user'
    const pageConfig = pages.find((item) => item.href === props.page)
    const isAllowed = isPageAllowedForRole(pageConfig?.accessRoles, role)
    if (!isAllowed) {
      router.push('/cabinet/eventsUpcoming')
    }
  }, [loggedUser?._id, loggedUser?.role, props.page, router])

  // Убрали авто-редирект со страницы заявок при пустом списке.

  // useEffect(() => {
  //   if (loggedUser) {
  //     postData(
  //       `/api/loginhistory`,
  //       {
  //         userId: loggedUser._id,
  //         browser: browserVer(true),
  //       },
  //       null,
  //       null,
  //       false,
  //       null,
  //       true
  //     )
  //   }
  // }, [loggedUser])

  return (
    <div className={cn('relative overflow-hidden', props.className)}>
      {isSiteLoading ? (
        <div className="h-[100dvh] w-full">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="relative w-full bg-transparent">{props.children}</div>
      )}
      <ModalsPortal />
    </div>
  )
}

export default StateLoader
