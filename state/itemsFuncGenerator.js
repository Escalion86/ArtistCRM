import { postData, putData, deleteData } from '@helpers/CRUD'
import isSiteLoadingAtom from './atoms/isSiteLoadingAtom'

import { setAtomValue } from '@state/storeHelpers'
import addErrorModalSelector from './selectors/addErrorModalSelector'
import setLoadingSelector from './selectors/setLoadingSelector'
import setNotLoadingSelector from './selectors/setNotLoadingSelector'
import setErrorSelector from './selectors/setErrorSelector'
import setNotErrorSelector from './selectors/setNotErrorSelector'
import eventEditSelector from './selectors/eventEditSelector'
import eventDeleteSelector from './selectors/eventDeleteSelector'
import userDeleteSelector from './selectors/userDeleteSelector'
import userEditSelector from './selectors/userEditSelector'
import requestEditSelector from './selectors/requestEditSelector'
import requestDeleteSelector from './selectors/requestDeleteSelector'
import clientEditSelector from './selectors/clientEditSelector'
import serviceEditSelector from './selectors/serviceEditSelector'
import serviceDeleteSelector from './selectors/serviceDeleteSelector'
// import siteSettingsAtom from './atoms/siteSettingsAtom'
// import questionnaireEditSelector from './selectors/questionnaireEditSelector'
// import questionnaireDeleteSelector from './selectors/questionnaireDeleteSelector'
// import questionnaireUsersEditSelector from './selectors/questionnaireUsersEditSelector'
// import questionnaireUsersDeleteSelector from './selectors/questionnaireUsersDeleteSelector'
// import serviceEditSelector from './selectors/serviceEditSelector'
// import serviceDeleteSelector from './selectors/serviceDeleteSelector'
// import servicesUsersEditSelector from './selectors/servicesUsersEditSelector'
// import servicesUsersDeleteSelector from './selectors/servicesUsersDeleteSelector'
// import setEventsUsersSelector from './async/setEventsUsersSelector'
// import signOutUserSelector from './async/signOutUserSelector'
// import signUpUserSelector from './async/signUpUserSelector'
// import setEventUserSelector from './async/setEventUserSelector'
// import rolesAtom from './atoms/rolesAtom'
// import updateEventsUsersSelector from './async/updateEventsUsersSelector'

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

const messages = {
  request: {
    update: {
      success: 'Заявка обновлено',
      error: 'Не удалось обновить заявку',
    },
    add: {
      success: 'Заявка создано',
      error: 'Не удалось создать заявку',
    },
    delete: {
      success: 'Заявка удалено',
      error: 'Не удалось удалить заявку',
    },
  },
  event: {
    update: {
      success: 'Мероприятие обновлено',
      error: 'Не удалось обновить мероприятие',
    },
    add: {
      success: 'Мероприятие создано',
      error: 'Не удалось создать мероприятие',
    },
    delete: {
      success: 'Мероприятие удалено',
      error: 'Не удалось удалить мероприятие',
    },
  },
  client: {
    update: {
      success: 'Клиент обновлен',
      error: 'Не удалось обновить клиента',
    },
    add: {
      success: 'Клиент создан',
      error: 'Не удалось создать клиента',
    },
    delete: {
      success: 'Клиент удален',
      error: 'Не удалось удалить клиента',
    },
  },
  service: {
    update: {
      success: 'Услуга обновлена',
      error: 'Не удалось обновить услугу',
    },
    add: {
      success: 'Услуга создана',
      error: 'Не удалось создать услугу',
    },
    delete: {
      success: 'Услуга удалена',
      error: 'Не удалось удалить услугу',
    },
  },
  user: {
    update: {
      success: 'Пользователь обновлен',
      error: 'Не удалось обновить пользователя',
    },
    add: {
      success: 'Пользователь создан',
      error: 'Не удалось создать пользователя',
    },
    delete: {
      success: 'Пользователь удален',
      error: 'Не удалось удалить пользователя',
    },
  },
  // eventsUser: {
  //   update: {
  //     success: 'Пользователь на мероприятии обновлен',
  //     error: 'Не удалось обновить пользователя на мероприятии',
  //   },
  //   add: {
  //     success: 'Пользователь на мероприятии создан',
  //     error: 'Не удалось создать пользователя на мероприятии',
  //   },
  //   delete: {
  //     success: 'Пользователь на мероприятии удален',
  //     error: 'Не удалось удалить пользователя на мероприятии',
  //   },
  // },
  // servicesUser: {
  //   update: {
  //     success: 'Заявка на услугу обновлена',
  //     error: 'Не удалось обновить заявку на услугу',
  //   },
  //   add: {
  //     success: 'Заявка на услугу создана',
  //     error: 'Не удалось создать заявку на услугу',
  //   },
  //   delete: {
  //     success: 'Заявка на услугу удалена',
  //     error: 'Не удалось удалить заявку на услугу',
  //   },
  // },
}

const setFunc = (atom) => (value) => setAtomValue(atom, value)

// const setFamilyFunc = (selector) => (id, value) =>
//   setRecoil(selector(id), value)

const props = {
  setLoading: setFunc(isSiteLoadingAtom),
  addErrorModal: setFunc(addErrorModalSelector),
  setLoadingCard: setFunc(setLoadingSelector),
  setNotLoadingCard: setFunc(setNotLoadingSelector),
  setErrorCard: setFunc(setErrorSelector),
  setNotErrorCard: setFunc(setNotErrorSelector),
  setEvent: setFunc(eventEditSelector),
  deleteEvent: setFunc(eventDeleteSelector),
  setRequest: setFunc(requestEditSelector),
  deleteRequest: setFunc(requestDeleteSelector),
  setClient: setFunc(clientEditSelector),
  setUser: setFunc(userEditSelector),

  // setEventsUsers: setFamilyFunc(setEventsUsersSelector),
  // updateEventsUsers: setFamilyFunc(updateEventsUsersSelector),
  // deleteEventsUser: setFunc(signOutUserSelector),
  // addEventsUser: setFunc(signUpUserSelector),
  // setEventsUser: setFunc(setEventUserSelector),

  // setSiteSettings: setFunc(siteSettingsAtom),
  // setQuestionnaire: setFunc(questionnaireEditSelector),
  // deleteQuestionnaire: setFunc(questionnaireDeleteSelector),
  // setQuestionnaireUsers: setFunc(questionnaireUsersEditSelector),
  // deleteQuestionnaireUsers: setFunc(questionnaireUsersDeleteSelector),
  setService: setFunc(serviceEditSelector),
  deleteService: setFunc(serviceDeleteSelector),
  deleteUser: setFunc(userDeleteSelector),
  // setServicesUser: setFunc(servicesUsersEditSelector),
  // deleteServicesUser: setFunc(servicesUsersDeleteSelector),
  // setRoles: setFunc(rolesAtom),
}

const itemsFuncGenerator = (
  snackbar,
  loggedUser,
  array = [
    'request',
    'event',
    'client',
    'service',
    'user',
    // 'eventsUser',
    // 'user',
    // 'questionnaire',
    // 'questionnairesUser',
    // 'service',
    // 'eventsUser',
    // 'servicesUser',
    // 'eventsTag',
  ]
) => {
  const {
    setLoadingCard,
    setNotLoadingCard,
    setErrorCard,
    // setNotErrorCard,
    addErrorModal,
    // snackbar = {},
  } = props
  const obj = {}
  array?.length > 0 &&
    array.forEach((itemName) => {
      obj[itemName] = {
        set: async (item, clone, noSnackbar) => {
          if (item?._id && !clone) {
            setLoadingCard(itemName + item._id)
            return await putData(
              `/api/${itemName.toLowerCase()}s/${item._id}`,
              item,
              (data) => {
                setNotLoadingCard(itemName + item._id)
                if (!noSnackbar && messages[itemName]?.update?.success)
                  snackbar.success(messages[itemName].update.success)
                if (itemName === 'request') {
                  if (data?.request)
                    props['set' + capitalizeFirstLetter(itemName)](data.request)
                  else props['set' + capitalizeFirstLetter(itemName)](data)
                  if (data?.client) props.setClient(data.client)
                } else {
                  props['set' + capitalizeFirstLetter(itemName)](data)
                }
                // setEvent(data)
              },
              (error) => {
                if (!noSnackbar && messages[itemName]?.update?.error)
                  snackbar.error(messages[itemName].update.error)
                setErrorCard(itemName + item._id)
                const data = {
                  errorPlace: 'UPDATE ERROR',
                  itemName,
                  item,
                  error,
                }
                addErrorModal(data)
              },
              false,
              loggedUser?._id
            )
          } else {
            const clearedItem = { ...item }
            delete clearedItem._id
            return await postData(
              `/api/${itemName.toLowerCase()}s`,
              clearedItem,
              (data) => {
                if (!noSnackbar && messages[itemName]?.add?.success)
                  snackbar.success(messages[itemName].add.success)
                if (itemName === 'request') {
                  if (data?.request)
                    props['set' + capitalizeFirstLetter(itemName)](data.request)
                  else props['set' + capitalizeFirstLetter(itemName)](data)
                  if (data?.client) props.setClient(data.client)
                } else {
                  props['set' + capitalizeFirstLetter(itemName)](data)
                }
                // setEvent(data)
              },
              (error) => {
                if (!noSnackbar && messages[itemName]?.add?.error)
                  snackbar.error(messages[itemName].add.error)
                setErrorCard(itemName + item._id)
                const data = {
                  errorPlace: 'CREATE ERROR',
                  itemName,
                  item,
                  error,
                }
                addErrorModal(data)
                console.log(data)
              },
              false,
              loggedUser?._id
            )
          }
        },
        delete: async (itemId) => {
          setLoadingCard(itemName + itemId)
          return await deleteData(
            `/api/${itemName.toLowerCase()}s/${itemId}`,
            () => {
              if (messages[itemName]?.delete?.success)
                snackbar.success(messages[itemName].delete.success)
              props['delete' + capitalizeFirstLetter(itemName)](itemId)
            },
            (error) => {
              if (messages[itemName]?.delete?.error)
                snackbar.error(messages[itemName].delete.error)
              setErrorCard(itemName + itemId)
              const data = {
                errorPlace: 'DELETE ERROR',
                itemName,
                itemId,
                error,
              }
              addErrorModal(data)
              console.log(data)
            },
            false,
            loggedUser?._id
            //  deleteEvent(itemId)
          )
        },
      }
    })


  obj.event.cancel = async (eventId) => {
    setLoadingCard('event' + eventId)
    return await putData(
      `/api/events/${eventId}`,
      { status: 'canceled' },
      (data) => {
        snackbar.success('Мероприятие отменено')
        setNotLoadingCard('event' + eventId)
        props.setEvent(data)
      },
      (error) => {
        snackbar.error('Не удалось отменить мероприятие')
        setErrorCard('event' + eventId)
        const data = { errorPlace: 'EVENT CANCEL ERROR', eventId, error }
        addErrorModal(data)
        console.log(data)
      },
      false,
      loggedUser?._id
    )
  }

  obj.event.close = async (eventId) => {
    setLoadingCard('event' + eventId)
    return await putData(
      `/api/events/${eventId}`,
      { status: 'close' },
      (data) => {
        snackbar.success('Мероприятие закрыто')
        setNotLoadingCard('event' + eventId)
        props.setEvent(data)
      },
      (error) => {
        snackbar.error('Не удалось закрыть мероприятие')
        setErrorCard('event' + eventId)
        const data = { errorPlace: 'EVENT CLOSE ERROR', eventId, error }
        addErrorModal(data)
        console.log(data)
      },
      false,
      loggedUser?._id
    )
  }
  // obj.roles = {}
  // obj.roles.update = async (roles) => {
  //   return await postData(
  //     `/api/roles`,
  //     roles,
  //     (data) => {
  //       snackbar.success('Роли обновлены')
  //       props.setRoles(data)
  //     },
  //     (error) => {
  //       snackbar.error('Не удалось обновить роли')
  //       const data = { errorPlace: 'ROLES UPDATE ERROR', roles, error }
  //       addErrorModal(data)
  //       console.log(data)
  //     },
  //     false,
  //     loggedUser?._id
  //   )
  // }

  obj.event.uncancel = async (eventId) => {
    setLoadingCard('event' + eventId)
    return await putData(
      `/api/events/${eventId}`,
      { status: 'active' },
      (data) => {
        snackbar.success('Мероприятие активировано')
        setNotLoadingCard('event' + eventId)
        props.setEvent(data)
      },
      (error) => {
        snackbar.error('не удалось активировать мероприятие')
        setErrorCard('event' + eventId)
        const data = { errorPlace: 'EVENT ACTIVE ERROR', eventId, error }
        addErrorModal(data)
        console.log(data)
      },
      false,
      loggedUser?._id
    )
  }

  if (obj.request) {
    obj.request.convert = async (requestId, eventData = null) => {
      setLoadingCard('request' + requestId)
      return await putData(
        `/api/requests/${requestId}`,
        { convertToEvent: true, eventData },
        (data) => {
          const { request, event, client } = data ?? {}
          snackbar.success('Мероприятие создано из заявки')
          setNotLoadingCard('request' + requestId)
          if (request) props.setRequest(request)
          if (event) props.setEvent(event)
          if (client) props.setClient(client)
        },
        (error) => {
          snackbar.error('Не удалось преобразовать заявку')
          setErrorCard('request' + requestId)
          const data = {
            errorPlace: 'REQUEST CONVERT ERROR',
            requestId,
            error,
          }
          addErrorModal(data)
          console.log(data)
        },
        false,
        loggedUser?._id
      )
    }
  }

  return obj
}

export default itemsFuncGenerator
