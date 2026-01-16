import { useAtom, useSetAtom } from 'jotai'

import requestsAtom from '@state/atoms/requestsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import clientsAtom from '@state/atoms/clientsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import transactionsAtom from '@state/atoms/transactionsAtom'
import servicesAtom from '@state/atoms/servicesAtom'
import usersAtom from '@state/atoms/usersAtom'
import { useEffect } from 'react'
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
        itemsFunc
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
    props.transactions,
    props.users,
    setClientsState,
    setEventsState,
    setIsSiteLoading,
    setLoggedUser,
    setRequestsState,
    setServicesState,
    setUsersState,
    setSiteSettingsState,
    setTransactionsState,
  ])

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
