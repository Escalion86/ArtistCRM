import { useAtom, useSetAtom } from 'jotai'

import requestsAtom from '@state/atoms/requestsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import servicesAtom from '@state/atoms/servicesAtom'
import usersAtom from '@state/atoms/usersAtom'
import tariffsAtom from '@state/atoms/tariffsAtom'
import { useEffect, useRef } from 'react'
import LoadingSpinner from '@components/LoadingSpinner'
import ModalsPortal from '@layouts/modals/ModalsPortal'
import isSiteLoadingAtom from '@state/atoms/isSiteLoadingAtom'
import cn from 'classnames'
import { useRouter } from 'next/navigation'
import { useWindowDimensionsRecoil } from '@helpers/useWindowDimensions'
import { modalsFuncAtom } from '@state/atoms'
import modalsFuncGenerator from '@layouts/modals/modalsFuncGenerator'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import itemsFuncGenerator from '@state/itemsFuncGenerator'
import useSnackbar from '@helpers/useSnackbar'
import { getUserTariffAccess } from '@helpers/tariffAccess'
import { pages } from '@helpers/constants'
import isPageAllowedForRole from '@helpers/pageAccess'

const StateLoader = (props) => {
  if (props.error && Object.keys(props.error).length > 0)
    console.log('props.error', props.error)

  const snackbar = useSnackbar()

  const router = useRouter()

  const [modalFunc, setModalsFunc] = useAtom(modalsFuncAtom)

  const [isSiteLoading, setIsSiteLoading] = useAtom(isSiteLoadingAtom)

  // const [mode, setMode] = useAtom(modeAtom)

  const [loggedUser, setLoggedUser] = useAtom(loggedUserAtom)

  const setRequestsState = useSetAtom(requestsAtom)
  const setEventsState = useSetAtom(eventsAtom)
  const setClientsState = useSetAtom(clientsAtom)
  const setTransactionsState = useSetAtom(transactionsAtom)
  const [siteSettingsState, setSiteSettingsState] =
    useAtom(siteSettingsAtom)
  const setUsersState = useSetAtom(usersAtom)
  // const setRolesSettingsState = useSetAtom(rolesAtom)
  // const setHistoriesState = useSetAtom(historiesAtom)
  // const setQuestionnairesState = useSetAtom(questionnairesAtom)
  // const setQuestionnairesUsersState = useSetAtom(questionnairesUsersAtom)
  const setServicesState = useSetAtom(servicesAtom)
  const setTariffsState = useSetAtom(tariffsAtom)
  // const setServicesUsersState = useSetAtom(servicesUsersAtom)
  // const setServerSettingsState = useSetAtom(serverSettingsAtom)

  const setItemsFunc = useSetAtom(itemsFuncAtom)

  useWindowDimensionsRecoil()

  useEffect(() => {
    const itemsFunc = itemsFuncGenerator(snackbar, loggedUser)
    setItemsFunc(itemsFunc)
    setModalsFunc(
      modalsFuncGenerator(
        router,
        itemsFunc,
        loggedUser
        // loggedUser,
        // siteSettingsState,
      )
    )
  }, [loggedUser, router, setItemsFunc, setModalsFunc, snackbar])

  useEffect(() => {
    setLoggedUser(props.loggedUser)
    setRequestsState(props.requests)
    setEventsState(props.events)
    setClientsState(props.clients)
    setTransactionsState(props.transactions ?? [])
    setServicesState(props.services ?? [])
    setTariffsState(props.tariffs ?? [])
    setUsersState(props.users ?? [])
    setSiteSettingsState(props.siteSettings)
    setIsSiteLoading(false)
  }, [
    props.clients,
    props.events,
    props.loggedUser,
    props.requests,
    props.siteSettings,
    props.services,
    props.tariffs,
    props.transactions,
    props.users,
    setClientsState,
    setEventsState,
    setIsSiteLoading,
    setLoggedUser,
    setRequestsState,
    setServicesState,
    setTariffsState,
    setUsersState,
    setSiteSettingsState,
    setTransactionsState,
  ])

  useEffect(() => {
    if (!loggedUser?._id) return
    const access = getUserTariffAccess(loggedUser, props.tariffs ?? [])
    const needsTariff = !access.trialActive && !access.hasTariff
    const allowedPages = ['tariff-select', 'tariffs']
    if (needsTariff && props.page && !allowedPages.includes(props.page)) {
      router.push('/cabinet/tariff-select')
    }
  }, [loggedUser?._id, loggedUser?.tariffId, props.page, router])

  const onboardingShownRef = useRef(false)

  useEffect(() => {
    if (!loggedUser?._id || onboardingShownRef.current) return
    const firstName = loggedUser?.firstName?.trim() ?? ''
    const secondName = loggedUser?.secondName?.trim() ?? ''
    const town =
      loggedUser?.town?.trim() ?? siteSettingsState?.defaultTown?.trim() ?? ''
    const timeZone = siteSettingsState?.timeZone ?? ''
    const needsOnboarding =
      !firstName || !secondName || !town || !timeZone

    if (needsOnboarding && modalFunc?.user?.onboarding) {
      onboardingShownRef.current = true
      modalFunc.user.onboarding()
    }
  }, [
    loggedUser?._id,
    loggedUser?.firstName,
    loggedUser?.secondName,
    loggedUser?.town,
    siteSettingsState?.defaultTown,
    siteSettingsState?.timeZone,
    modalFunc,
  ])

  useEffect(() => {
    if (!loggedUser?._id || !props.page) return
    const role = loggedUser?.role ?? 'user'
    const pageConfig = pages.find((item) => item.href === props.page)
    const isAllowed = isPageAllowedForRole(pageConfig?.accessRoles, role)
    if (!isAllowed) {
      router.push('/cabinet/requests')
    }
  }, [loggedUser?._id, loggedUser?.role, props.page, router])

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
        <div className="h-screen w-full">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="relative w-full bg-white">{props.children}</div>
      )}
      <ModalsPortal />
    </div>
  )
}

export default StateLoader
