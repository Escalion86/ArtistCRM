import DateTimePicker from '@components/DateTimePicker'
import ErrorsList from '@components/ErrorsList'
import FormWrapper from '@components/FormWrapper'
import IconCheckBox from '@components/IconCheckBox'
import AddIconButton from '@components/AddIconButton'
import IconActionButton from '@components/IconActionButton'
import Textarea from '@components/Textarea'
import { faCircleCheck, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import ClientPicker from '@components/ClientPicker'
import ColleaguePicker from '@components/ColleaguePicker'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  DEFAULT_ADDRESS,
  DEFAULT_EVENT,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
} from '@helpers/constants'
import { getEventStatusButtonClasses } from '@helpers/eventStatusStyles'
import TabContext from '@components/Tabs/TabContext'
import TabPanel from '@components/Tabs/TabPanel'
import transactionsAtom from '@state/atoms/transactionsAtom'
import eventsAtom from '@state/atoms/eventsAtom'
import { deleteData, postData } from '@helpers/CRUD'
import useErrors from '@helpers/useErrors'
import clientsAtom from '@state/atoms/clientsAtom'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { modalsFuncAtom } from '@state/atoms'
import eventSelector from '@state/selectors/eventSelector'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import Input from '@components/Input'
import AppButton from '@components/AppButton'
import AddressPicker from '@components/AddressPicker'
import InputWrapper from '@components/InputWrapper'
import OtherContactsPicker from '@components/OtherContactsPicker'
import LinksListEditor from '@components/LinksListEditor'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import ServiceMultiSelect from '@components/ServiceMultiSelect'
import serviceFunc from './serviceFunc'
import servicesAtom from '@state/atoms/servicesAtom'
import generateContractTemplate from '@helpers/generateContractTemplate'
import exportContractTemplateDocx from '@helpers/exportContractTemplateDocx'
import getPersonFullName from '@helpers/getPersonFullName'

const normalizeAddressValue = (rawAddress) => {
  const normalized = { ...DEFAULT_ADDRESS }

  if (!rawAddress) return normalized

  if (typeof rawAddress === 'string') {
    return { ...normalized, comment: rawAddress }
  }

  if (typeof rawAddress !== 'object') return normalized

  Object.keys(DEFAULT_ADDRESS).forEach((key) => {
    if (
      key in rawAddress &&
      rawAddress[key] !== undefined &&
      rawAddress[key] !== null
    ) {
      normalized[key] = rawAddress[key]
    }
  })

  return normalized
}

const normalizeLinksList = (links) => {
  if (!Array.isArray(links)) return []
  return links
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

const normalizeOtherContacts = (contacts) => {
  if (!Array.isArray(contacts)) return []
  return contacts
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      return {
        clientId: item.clientId ?? null,
        comment: typeof item.comment === 'string' ? item.comment : '',
      }
    })
    .filter(Boolean)
}

const normalizeAdditionalEvents = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      return {
        title: typeof item.title === 'string' ? item.title : '',
        description:
          typeof item.description === 'string' ? item.description : '',
        date: item.date ?? null,
        done: Boolean(item.done),
        googleCalendarEventId:
          typeof item.googleCalendarEventId === 'string'
            ? item.googleCalendarEventId
            : '',
      }
    })
    .filter(Boolean)
}

const eventFunc = (eventId, clone = false, initialStatus = null) => {
  const EventModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
    setComponentInFooter,
  }) => {
    const event = useAtomValue(eventSelector(eventId))
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const setEvent = itemsFunc?.event?.set
    const clients = useAtomValue(clientsAtom)
    const loggedUser = useAtomValue(loggedUserAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    const colleagues = useMemo(
      () => clients.filter((client) => client.clientType === 'colleague'),
      [clients]
    )
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const transactions = useAtomValue(transactionsAtom)
    const services = useAtomValue(servicesAtom)
    const events = useAtomValue(eventsAtom)
    const setTransactions = useSetAtom(transactionsAtom)
    const closeModalRef = useRef(closeModal)

    const initialIsTransferred =
      event?.isTransferred ??
      (event?.colleagueId ? true : (DEFAULT_EVENT.isTransferred ?? false))

    const initialStatusValue = clone
      ? 'active'
      : (event?.status ?? initialStatus ?? DEFAULT_EVENT.status)
    const [status, setStatus] = useState(initialStatusValue)
    const isDraft = status === 'draft'

    const [clientId, setClientId] = useState(
      event?.clientId ?? DEFAULT_EVENT.clientId
    )
    const [eventDate, setEventDate] = useState(
      event?.eventDate ?? DEFAULT_EVENT.eventDate
    )
    const [dateEnd, setDateEnd] = useState(
      event?.dateEnd ?? DEFAULT_EVENT.dateEnd ?? null
    )
    const [dateEndTouched, setDateEndTouched] = useState(false)
    const [invoiceLinks, setInvoiceLinks] = useState(
      event?.invoiceLinks ?? DEFAULT_EVENT.invoiceLinks ?? []
    )
    const [receiptLinks, setReceiptLinks] = useState(
      event?.receiptLinks ?? DEFAULT_EVENT.receiptLinks ?? []
    )
    const [actLinks, setActLinks] = useState(
      event?.actLinks ?? DEFAULT_EVENT.actLinks ?? []
    )
    const [contractLinks, setContractLinks] = useState(
      event?.contractLinks ?? DEFAULT_EVENT.contractLinks ?? []
    )
    const [address, setAddress] = useState(() => {
      const normalized = normalizeAddressValue(event?.address)

      if (!normalized.town && siteSettings?.defaultTown && !eventId) {
        normalized.town = siteSettings.defaultTown
      }
      return normalized
    })

    const [contractSum, setContractSum] = useState(
      event?.contractSum ?? DEFAULT_EVENT.contractSum ?? 0
    )
    const [waitDeposit, setWaitDeposit] = useState(
      clone ? false : (event?.waitDeposit ?? DEFAULT_EVENT.waitDeposit ?? false)
    )
    const [depositDueAt, setDepositDueAt] = useState(
      clone ? null : (event?.depositDueAt ?? DEFAULT_EVENT.depositDueAt ?? null)
    )
    const [isByContract, setIsByContract] = useState(
      event?.isByContract ?? DEFAULT_EVENT.isByContract ?? false
    )
    const [isTransferred, setIsTransferred] = useState(initialIsTransferred)
    const [colleagueId, setColleagueId] = useState(
      event?.colleagueId ?? DEFAULT_EVENT.colleagueId ?? null
    )
    const [description, setDescription] = useState(
      event?.description ?? event?.comment ?? DEFAULT_EVENT.description ?? ''
    )
    const [financeComment, setFinanceComment] = useState(
      event?.financeComment ?? DEFAULT_EVENT.financeComment ?? ''
    )
    const [requestCreatedAt, setRequestCreatedAt] = useState(() => {
      if (!eventId || clone) return new Date().toISOString()
      return (
        event?.requestCreatedAt ?? event?.createdAt ?? new Date().toISOString()
      )
    })
    const [additionalEvents, setAdditionalEvents] = useState(() =>
      clone
        ? []
        : normalizeAdditionalEvents(
            event?.additionalEvents ?? DEFAULT_EVENT.additionalEvents ?? []
          )
    )
    const [showDoneAdditionalEvents, setShowDoneAdditionalEvents] =
      useState(false)
    const [calendarImportChecked, setCalendarImportChecked] = useState(
      event?.calendarImportChecked ??
        (eventId ? (DEFAULT_EVENT.calendarImportChecked ?? false) : true)
    )
    const [servicesIds, setServicesIds] = useState(
      event?.servicesIds ?? DEFAULT_EVENT.servicesIds ?? []
    )
    const [otherContacts, setOtherContacts] = useState(
      event?.otherContacts ?? DEFAULT_EVENT.otherContacts ?? []
    )
    const googleCalendarResponse = event?.googleCalendarResponse ?? null
    const googleCalendarResponseText = useMemo(() => {
      if (!googleCalendarResponse) return ''
      if (typeof googleCalendarResponse === 'string')
        return googleCalendarResponse
      try {
        return JSON.stringify(googleCalendarResponse, null, 2)
      } catch (error) {
        return String(googleCalendarResponse)
      }
    }, [googleCalendarResponse])

    const importedFromCalendar =
      event?.importedFromCalendar ?? DEFAULT_EVENT.importedFromCalendar

    const [errors, , addError, removeError, clearErrors] = useErrors()
    const addErrorRef = useRef(addError)
    const clearErrorsRef = useRef(clearErrors)

    useEffect(() => {
      addErrorRef.current = addError
      clearErrorsRef.current = clearErrors
      closeModalRef.current = closeModal
    }, [addError, clearErrors, closeModal])

    const initialEventValues = useMemo(() => {
      return {
        clientId: event?.clientId ?? DEFAULT_EVENT.clientId,
        eventDate: event?.eventDate ?? DEFAULT_EVENT.eventDate,
        address: (() => {
          const normalized = normalizeAddressValue(event?.address)
          if (
            !normalized.town &&
            siteSettings?.defaultTown &&
            !eventId &&
            !event?.address?.town
          ) {
            normalized.town = siteSettings.defaultTown
          }
          return normalized
        })(),
        contractSum: event?.contractSum ?? DEFAULT_EVENT.contractSum,
        waitDeposit: event?.waitDeposit ?? DEFAULT_EVENT.waitDeposit,
        depositDueAt: event?.depositDueAt ?? DEFAULT_EVENT.depositDueAt,
        isByContract: event?.isByContract ?? DEFAULT_EVENT.isByContract,
        description:
          event?.description ?? event?.comment ?? DEFAULT_EVENT.description,
        financeComment: event?.financeComment ?? DEFAULT_EVENT.financeComment,
        dateEnd: event?.dateEnd ?? DEFAULT_EVENT.dateEnd,
        invoiceLinks: event?.invoiceLinks ?? DEFAULT_EVENT.invoiceLinks ?? [],
        receiptLinks: event?.receiptLinks ?? DEFAULT_EVENT.receiptLinks ?? [],
        actLinks: event?.actLinks ?? DEFAULT_EVENT.actLinks ?? [],
        contractLinks:
          event?.contractLinks ?? DEFAULT_EVENT.contractLinks ?? [],
        calendarImportChecked:
          event?.calendarImportChecked ??
          (eventId ? DEFAULT_EVENT.calendarImportChecked : true),
        servicesIds: event?.servicesIds ?? DEFAULT_EVENT.servicesIds ?? [],
        otherContacts: normalizeOtherContacts(
          event?.otherContacts ?? DEFAULT_EVENT.otherContacts ?? []
        ),
        colleagueId: event?.colleagueId ?? DEFAULT_EVENT.colleagueId,
        isTransferred: initialIsTransferred,
        status: initialStatusValue,
        requestCreatedAt:
          event?.requestCreatedAt ?? event?.createdAt ?? requestCreatedAt,
        additionalEvents: clone
          ? []
          : normalizeAdditionalEvents(
              event?.additionalEvents ?? DEFAULT_EVENT.additionalEvents ?? []
            ),
      }
    }, [
      event?.clientId,
      event?.eventDate,
      event?.address,
      event?.contractSum,
      event?.waitDeposit,
      event?.depositDueAt,
      event?.description,
      event?.isByContract,
      event?.financeComment,
      event?.comment,
      event?.dateEnd,
      event?.invoiceLinks,
      event?.receiptLinks,
      event?.actLinks,
      event?.contractLinks,
      event?.calendarImportChecked,
      event?.colleagueId,
      event?.otherContacts,
      event?.servicesIds,
      initialIsTransferred,
      initialStatusValue,
      event?.requestCreatedAt,
      event?.createdAt,
      requestCreatedAt,
      event?.additionalEvents,
      siteSettings?.defaultTown,
    ])

    const initialAddressSignature = useMemo(
      () => JSON.stringify(initialEventValues.address ?? {}),
      [initialEventValues.address]
    )

    const addressSignature = useMemo(
      () => JSON.stringify(address ?? {}),
      [address]
    )

    const isFormChanged = useMemo(
      () =>
        initialEventValues.clientId !== clientId ||
        initialEventValues.eventDate !== eventDate ||
        initialEventValues.dateEnd !== dateEnd ||
        initialAddressSignature !== addressSignature ||
        initialEventValues.contractSum !== contractSum ||
        initialEventValues.waitDeposit !== waitDeposit ||
        initialEventValues.depositDueAt !== depositDueAt ||
        initialEventValues.isByContract !== isByContract ||
        initialEventValues.isTransferred !== isTransferred ||
        initialEventValues.colleagueId !== colleagueId ||
        initialEventValues.description !== description ||
        initialEventValues.financeComment !== financeComment ||
        initialEventValues.status !== status ||
        initialEventValues.requestCreatedAt !== requestCreatedAt ||
        JSON.stringify(initialEventValues.additionalEvents ?? []) !==
          JSON.stringify(additionalEvents) ||
        JSON.stringify(initialEventValues.invoiceLinks ?? []) !==
          JSON.stringify(invoiceLinks) ||
        JSON.stringify(initialEventValues.receiptLinks ?? []) !==
          JSON.stringify(receiptLinks) ||
        JSON.stringify(initialEventValues.actLinks ?? []) !==
          JSON.stringify(actLinks) ||
        JSON.stringify(initialEventValues.contractLinks ?? []) !==
          JSON.stringify(contractLinks) ||
        initialEventValues.calendarImportChecked !== calendarImportChecked ||
        JSON.stringify(initialEventValues.servicesIds ?? []) !==
          JSON.stringify(servicesIds) ||
        JSON.stringify(initialEventValues.otherContacts ?? []) !==
          JSON.stringify(otherContacts),
      [
        clientId,
        eventDate,
        dateEnd,
        initialAddressSignature,
        addressSignature,
        contractSum,
        waitDeposit,
        depositDueAt,
        isByContract,
        isTransferred,
        colleagueId,
        description,
        financeComment,
        invoiceLinks,
        receiptLinks,
        actLinks,
        contractLinks,
        calendarImportChecked,
        servicesIds,
        otherContacts,
        initialEventValues,
        status,
        requestCreatedAt,
        additionalEvents,
      ]
    )

    useEffect(() => {
      setAddress(initialEventValues.address)
    }, [initialEventValues.address])

    const sourceEventId = clone ? null : event?._id

    const eventTransactions = useMemo(
      () =>
        (transactions ?? [])
          .filter((transaction) => transaction.eventId === sourceEventId)
          .sort(
            (a, b) =>
              new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
          ),
      [sourceEventId, transactions]
    )

    const incomeTransactions = useMemo(
      () => eventTransactions.filter((item) => item.type === 'income'),
      [eventTransactions]
    )
    const expenseTransactions = useMemo(
      () => eventTransactions.filter((item) => item.type === 'expense'),
      [eventTransactions]
    )
    const incomeTotal = useMemo(
      () =>
        incomeTransactions.reduce(
          (total, item) => total + (item.amount ?? 0),
          0
        ),
      [incomeTransactions]
    )
    const hasDepositTransaction = useMemo(
      () =>
        incomeTransactions.some(
          (item) =>
            ['deposit', 'advance'].includes(String(item?.category ?? '')) &&
            Number(item?.amount ?? 0) > 0
        ),
      [incomeTransactions]
    )
    const hasTaxes = useMemo(
      () => eventTransactions.some((item) => item.category === 'taxes'),
      [eventTransactions]
    )
    const canClose = contractSum <= incomeTotal && (!isByContract || hasTaxes)

    const missingFields = useMemo(() => {
      const fields = []
      if (!clientId) fields.push('Клиент')
      if (!eventDate) fields.push('Дата начала')
      if (!servicesIds || servicesIds.length === 0) fields.push('Услуги')
      if (isTransferred && !colleagueId) fields.push('Коллега')
      return fields
    }, [clientId, eventDate, servicesIds, isTransferred, colleagueId])
    const requiredMissing = missingFields.length > 0

    const dateRangeError = useMemo(() => {
      if (!eventDate || !dateEnd) return ''
      const startDate = new Date(eventDate)
      const endDate = new Date(dateEnd)
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
        return ''
      return startDate.getTime() > endDate.getTime()
        ? 'Дата начала не может быть позже даты завершения'
        : ''
    }, [eventDate, dateEnd])

    const defaultDurationMinutes = useMemo(() => {
      const minutes = Number(
        siteSettings?.custom?.defaultEventDurationMinutes ?? 60
      )
      return Number.isFinite(minutes) && minutes > 0 ? minutes : 60
    }, [siteSettings?.custom?.defaultEventDurationMinutes])

    const addMinutesToDate = (value, minutes) => {
      if (!value) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      date.setMinutes(date.getMinutes() + minutes)
      return date.toISOString()
    }

    const shiftEndByStartChange = (
      prevStartValue,
      nextStartValue,
      endValue
    ) => {
      if (!prevStartValue || !nextStartValue || !endValue) return null
      const prevStart = new Date(prevStartValue)
      const nextStart = new Date(nextStartValue)
      const prevEnd = new Date(endValue)
      if (
        Number.isNaN(prevStart.getTime()) ||
        Number.isNaN(nextStart.getTime()) ||
        Number.isNaN(prevEnd.getTime())
      ) {
        return null
      }

      const durationMs = prevEnd.getTime() - prevStart.getTime()
      if (durationMs <= 0) {
        return new Date(
          nextStart.getTime() + defaultDurationMinutes * 60 * 1000
        ).toISOString()
      }

      return new Date(nextStart.getTime() + durationMs).toISOString()
    }

    useEffect(() => {
      if (dateEndTouched) return
      if (!eventDate) return
      if (!dateEnd) {
        setDateEnd(addMinutesToDate(eventDate, defaultDurationMinutes))
      }
    }, [dateEnd, dateEndTouched, defaultDurationMinutes, eventDate])

    const buildRange = useCallback(
      (startValue, endValue) => {
        if (!startValue) return null
        const start = new Date(startValue)
        if (Number.isNaN(start.getTime())) return null
        let end = endValue ? new Date(endValue) : null
        if (!end || Number.isNaN(end.getTime()) || end <= start) {
          end = new Date(start.getTime() + defaultDurationMinutes * 60 * 1000)
        }
        return { start, end }
      },
      [defaultDurationMinutes]
    )

    const getConflictsCount = useCallback(() => {
      const targetRange = buildRange(eventDate, dateEnd)
      if (!targetRange) return 0
      let count = 0

      ;(events ?? []).forEach((item) => {
        if (!item) return
        if (eventId && String(item._id) === String(eventId)) return
        if (item.status === 'canceled') return
        const range = buildRange(item.eventDate, item.dateEnd)
        if (!range) return
        const overlaps =
          targetRange.start < range.end && range.start < targetRange.end
        if (overlaps) count += 1
      })

      return count
    }, [buildRange, dateEnd, eventDate, events])

    const onClickConfirm = useCallback(() => {
      clearErrorsRef.current()
      let hasError = false

      if (!clientId) {
        addErrorRef.current({ clientId: 'Выберите клиента' })
        hasError = true
      }
      if (!eventDate) {
        addErrorRef.current({ eventDate: 'Укажите дату мероприятия' })
        hasError = true
      }
      if (!servicesIds || servicesIds.length === 0) {
        addErrorRef.current({ servicesIds: 'Выберите услугу' })
        hasError = true
      }
      if (isTransferred && !colleagueId) {
        addErrorRef.current({ colleagueId: 'Выберите коллегу' })
        hasError = true
      }
      if (dateRangeError) {
        hasError = true
      }

      const proceedSave = () => {
        closeModalRef.current()
        const normalizedContractSum =
          typeof contractSum === 'number' && !Number.isNaN(contractSum)
            ? contractSum
            : 0
        const normalizedInvoiceLinks = normalizeLinksList(invoiceLinks)
        const normalizedReceiptLinks = normalizeLinksList(receiptLinks)
        const normalizedActLinks = normalizeLinksList(actLinks)
        const normalizedContractLinks = normalizeLinksList(contractLinks)
        const normalizedOtherContacts = normalizeOtherContacts(otherContacts)
          .map((item) => ({
            clientId: item.clientId ?? null,
            comment: item.comment?.trim() ?? '',
          }))
          .filter((item) => item.clientId)
        const normalizedAdditionalEvents = normalizeAdditionalEvents(
          additionalEvents
        )
          .map((item) => ({
            title: item.title?.trim() ?? '',
            description: item.description?.trim() ?? '',
            date: item.date ?? null,
            done: Boolean(item.done),
            googleCalendarEventId: item.googleCalendarEventId?.trim() ?? '',
          }))
          .filter((item) => item.title || item.description || item.date)
        const payload = {
          _id: event?._id,
          clientId,
          status,
          requestCreatedAt: requestCreatedAt ?? new Date().toISOString(),
          additionalEvents: normalizedAdditionalEvents,
          isTransferred,
          colleagueId: isTransferred ? colleagueId : null,
          eventDate,
          dateEnd,
          address: normalizeAddressValue(address),
          contractSum: normalizedContractSum,
          waitDeposit: hasDepositTransaction ? false : Boolean(waitDeposit),
          depositDueAt:
            hasDepositTransaction || !waitDeposit ? null : depositDueAt,
          isByContract,
          description: description?.trim() ?? '',
          financeComment: financeComment?.trim() ?? '',
          invoiceLinks: normalizedInvoiceLinks,
          receiptLinks: normalizedReceiptLinks,
          actLinks: normalizedActLinks,
          contractLinks: normalizedContractLinks,
          calendarImportChecked,
          servicesIds,
          otherContacts: normalizedOtherContacts,
        }
        setEvent(payload, clone)
      }

      if (!hasError) {
        const conflictsCount = getConflictsCount()
        if (conflictsCount > 0) {
          modalsFunc.add({
            title: 'Пересечение по времени',
            text: `Внимание! Есть мероприятия в выбранном периоде (${conflictsCount}). Все равно сохранить?`,
            confirmButtonName: 'Все равно сохранить',
            declineButtonName: 'Вернуться',
            showDecline: true,
            onConfirm: proceedSave,
          })
          return
        }
        proceedSave()
      }
    }, [
      addErrorRef,
      calendarImportChecked,
      clearErrorsRef,
      clientId,
      colleagueId,
      description,
      financeComment,
      contractSum,
      isByContract,
      waitDeposit,
      depositDueAt,
      dateEnd,
      event?._id,
      eventDate,
      getConflictsCount,
      isTransferred,
      invoiceLinks,
      receiptLinks,
      actLinks,
      contractLinks,
      address,
      modalsFunc,
      requestCreatedAt,
      additionalEvents,
      setEvent,
      servicesIds,
      otherContacts,
      dateRangeError,
      status,
      hasDepositTransaction,
    ])

    const onClickConfirmRef = useRef(onClickConfirm)

    useEffect(() => {
      onClickConfirmRef.current = onClickConfirm
    }, [onClickConfirm])

    useEffect(() => {
      setOnShowOnCloseConfirmDialog(isFormChanged)
      setDisableConfirm(false)
      setOnConfirmFunc(isFormChanged ? () => onClickConfirmRef.current() : null)
    }, [
      isFormChanged,
      setDisableConfirm,
      setOnConfirmFunc,
      setOnShowOnCloseConfirmDialog,
    ])

    useEffect(() => {
      if (!setComponentInFooter) return
      if (!requiredMissing && !dateRangeError) {
        setComponentInFooter(null)
        return
      }
      setComponentInFooter(
        <div className="flex flex-col gap-1 text-sm text-red-600">
          {requiredMissing && (
            <div>Заполните поля: {missingFields.join(', ')}</div>
          )}
          {dateRangeError && <div>{dateRangeError}</div>}
        </div>
      )
    }, [dateRangeError, missingFields, requiredMissing, setComponentInFooter])

    const selectedClient = useMemo(
      () =>
        clientId && clients.length
          ? clients.find((client) => client._id === clientId)
          : null,
      [clientId, clients]
    )
    const selectedServiceTitles = useMemo(
      () =>
        (services ?? [])
          .filter((item) => (servicesIds ?? []).includes(item._id))
          .map((item) => item?.title)
          .filter(Boolean),
      [services, servicesIds]
    )
    const hasDoneAdditionalEvents = useMemo(
      () => (additionalEvents ?? []).some((item) => Boolean(item?.done)),
      [additionalEvents]
    )
    const filteredAdditionalEvents = useMemo(
      () =>
        (additionalEvents ?? [])
          .map((item, index) => ({ item, index }))
          .filter(({ item }) =>
            showDoneAdditionalEvents ? true : !Boolean(item?.done)
          ),
      [additionalEvents, showDoneAdditionalEvents]
    )
    const buildContractTemplateText = useCallback(
      (
        documentNumber,
        contractDate,
        currentSettings = siteSettings,
        requisitesSidesMode = 'preview'
      ) =>
        generateContractTemplate({
          event: {
            ...event,
            eventDate,
            contractSum,
            address: normalizeAddressValue(address),
          },
          client: selectedClient,
          serviceTitles: selectedServiceTitles,
          performerName: getPersonFullName(loggedUser),
          template: currentSettings?.custom?.contractTemplate ?? '',
          contractMeta: {
            defaultTown: currentSettings?.defaultTown ?? '',
            artistFullName:
              currentSettings?.custom?.contractArtistFullName ?? '',
            artistName: currentSettings?.custom?.contractArtistName ?? '',
            artistStatus:
              currentSettings?.custom?.contractArtistStatus ??
              'individual_entrepreneur',
            artistOgrnip: currentSettings?.custom?.contractArtistOgrnip ?? '',
            artistInn: currentSettings?.custom?.contractArtistInn ?? '',
            artistBankName:
              currentSettings?.custom?.contractArtistBankName ?? '',
            artistBik: currentSettings?.custom?.contractArtistBik ?? '',
            artistCheckingAccount:
              currentSettings?.custom?.contractArtistCheckingAccount ?? '',
            artistCorrespondentAccount:
              currentSettings?.custom?.contractArtistCorrespondentAccount ?? '',
            artistLegalAddress:
              currentSettings?.custom?.contractArtistLegalAddress ?? '',
            documentNumber: documentNumber ? String(documentNumber) : '',
            nextDocumentNumber: documentNumber ? Number(documentNumber) : null,
            contractDate: contractDate || '',
            requisitesSidesMode,
          },
        }),
      [
        address,
        contractSum,
        event,
        eventDate,
        loggedUser,
        selectedClient,
        selectedServiceTitles,
        siteSettings,
      ]
    )

    const townOptions = useMemo(() => {
      const townsSet = new Set(
        (siteSettings?.towns ?? [])
          .map((town) => (typeof town === 'string' ? town.trim() : ''))
          .filter(Boolean)
      )
      if (address?.town && typeof address.town === 'string')
        townsSet.add(address.town.trim())

      return Array.from(townsSet).sort((a, b) => a.localeCompare(b, 'ru'))
    }, [address?.town, siteSettings?.towns])

    const handleCreateTown = async (town) => {
      const normalizedTown = typeof town === 'string' ? town.trim() : ''
      if (!normalizedTown) return
      const nextTowns = Array.from(
        new Set([...(siteSettings?.towns ?? []), normalizedTown])
      )
      await postData(
        '/api/site',
        { towns: nextTowns },
        (data) => setSiteSettings(data),
        null,
        false,
        loggedUser?._id
      )
    }

    const [financeError, setFinanceError] = useState('')
    const [financeLoading, setFinanceLoading] = useState(false)

    const handleDeleteTransaction = async (id) => {
      if (!id) return
      modalsFunc.confirm({
        title: 'Удаление транзакции',
        text: 'Вы уверены, что хотите удалить транзакцию?',
        onConfirm: async () => {
          setFinanceError('')
          setFinanceLoading(true)
          const response = await deleteData(`/api/transactions/${id}`)
          if (response !== null) {
            setTransactions((prev) => prev.filter((item) => item._id !== id))
          } else {
            setFinanceError('Не удалось удалить транзакцию')
          }
          setFinanceLoading(false)
        },
      })
    }

    const openClientSelectModal = () => {
      modalsFunc.client?.select((newClientId) => {
        setClientId(newClientId)
      })
    }

    const openServiceCreateModal = () => {
      modalsFunc.add(
        serviceFunc(null, true, (createdService) => {
          if (!createdService?._id) return
          setServicesIds((prev) =>
            prev.includes(createdService._id)
              ? prev
              : [...prev, createdService._id]
          )
          removeError('servicesIds')
        })
      )
    }

    const selectedColleague = useMemo(
      () =>
        colleagueId && colleagues.length
          ? colleagues.find((colleague) => colleague._id === colleagueId)
          : null,
      [colleagueId, colleagues]
    )

    const openColleagueSelectModal = () => {
      modalsFunc.client?.select(
        (newColleagueId) => {
          setColleagueId(newColleagueId)
        },
        'Выбор коллеги',
        { clientTypes: ['colleague'] }
      )
    }

    const handleOtherContactSelect = (index) => {
      modalsFunc.client?.select((newClientId) => {
        setOtherContacts((prev) =>
          prev.map((item, idx) =>
            idx === index ? { ...item, clientId: newClientId } : item
          )
        )
      })
    }

    const handleOtherContactCommentChange = (index, value) => {
      setOtherContacts((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, comment: value } : item
        )
      )
    }

    const handleOtherContactRemove = (index) => {
      setOtherContacts((prev) => prev.filter((_, idx) => idx !== index))
    }

    const handleOtherContactAdd = () => {
      setOtherContacts((prev) => [...prev, { clientId: null, comment: '' }])
    }

    const handleAdditionalEventRemove = (index) => {
      setAdditionalEvents((prev) => prev.filter((_, idx) => idx !== index))
    }

    const openAdditionalEventModal = (index = null) => {
      const sourceItem =
        index !== null
          ? additionalEvents[index]
          : {
              title: '',
              description: '',
              date: new Date().toISOString(),
              done: false,
              googleCalendarEventId: '',
            }
      const stateRef = {
        current: {
          title: sourceItem?.title ?? '',
          description: sourceItem?.description ?? '',
          date: sourceItem?.date ?? new Date().toISOString(),
          done: Boolean(sourceItem?.done),
          googleCalendarEventId: sourceItem?.googleCalendarEventId ?? '',
        },
      }

      const AdditionalEventModal = () => {
        const [title, setTitle] = useState(stateRef.current.title)
        const [description, setDescription] = useState(
          stateRef.current.description
        )
        const [date, setDate] = useState(stateRef.current.date)
        const [done, setDone] = useState(stateRef.current.done)
        const parseDateSafe = (value) => {
          if (!value) return null
          const parsed = new Date(value)
          return Number.isNaN(parsed.getTime()) ? null : parsed
        }
        const getBaseDate = () => parseDateSafe(date) || new Date()
        const applyPresetTime = (hours, minutes) => {
          const next = getBaseDate()
          next.setHours(hours, minutes, 0, 0)
          setDate(next.toISOString())
        }
        const applyPresetDateFromToday = (days) => {
          const base = getBaseDate()
          const next = new Date()
          next.setDate(next.getDate() + days)
          next.setHours(base.getHours(), base.getMinutes(), 0, 0)
          setDate(next.toISOString())
        }

        useEffect(() => {
          stateRef.current = {
            ...stateRef.current,
            title,
            description,
            date,
            done,
          }
        }, [date, description, done, title])

        return (
          <div className="mt-2 flex flex-col gap-y-2.5">
            <div className="mt-2 text-xs font-semibold text-gray-700">
              Быстрый заголовок
            </div>
            <div className="flex flex-wrap gap-2">
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => setTitle('Узнать что решили')}
              >
                Узнать что решили
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => setTitle('Встреча')}
              >
                Встреча
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => setTitle('Жду задаток')}
              >
                Жду задаток
              </AppButton>
            </div>
            <Input
              label="Заголовок"
              value={title}
              onChange={setTitle}
              noMargin
              fullWidth
            />
            <div className="text-xs font-semibold text-gray-700">
              Быстрая дата и время
            </div>
            <div className="flex flex-wrap gap-2">
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => applyPresetTime(11, 0)}
              >
                11:00
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => applyPresetTime(19, 0)}
              >
                19:00
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => applyPresetDateFromToday(0)}
              >
                Сегодня
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => applyPresetDateFromToday(1)}
              >
                Завтра
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => applyPresetDateFromToday(3)}
              >
                Через 2 дня
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                className="rounded"
                onClick={() => applyPresetDateFromToday(7)}
              >
                Через неделю
              </AppButton>
            </div>
            <DateTimePicker
              value={date ?? null}
              onChange={(value) => setDate(value ?? null)}
              label="Дата и время"
              noMargin
            />
            <Textarea
              label="Описание"
              value={description}
              onChange={setDescription}
              rows={3}
              noMargin
            />
            <IconCheckBox
              checked={done}
              onClick={() => setDone((prev) => !prev)}
              label="Сделано"
              checkedIcon={faCircleCheck}
              checkedIconColor="#16A34A"
              noMargin
            />
          </div>
        )
      }

      modalsFunc.add({
        title: `${index !== null ? 'Редактирование' : 'Создание'} доп. события`,
        confirmButtonName: 'Сохранить',
        declineButtonName: 'Отмена',
        showDecline: true,
        onConfirm: () => {
          const nextItem = {
            title: stateRef.current.title?.trim() ?? '',
            description: stateRef.current.description?.trim() ?? '',
            date: stateRef.current.date ?? null,
            done: Boolean(stateRef.current.done),
            googleCalendarEventId: stateRef.current.googleCalendarEventId ?? '',
          }
          if (index !== null) {
            setAdditionalEvents((prev) =>
              prev.map((item, idx) =>
                idx === index ? { ...item, ...nextItem } : item
              )
            )
          } else {
            setAdditionalEvents((prev) => [...prev, nextItem])
          }
        },
        Children: AdditionalEventModal,
      })
    }

    const handleAdditionalEventAdd = () => {
      openAdditionalEventModal(null)
    }

    const handleAdditionalEventEdit = (index) => {
      openAdditionalEventModal(index)
    }

    const handleAdditionalEventToggleDone = (index) => {
      setAdditionalEvents((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, done: !item?.done } : item
        )
      )
    }

    const openTransactionModal = (transactionId) => {
      if (clone) {
        setFinanceError('В копии транзакции недоступны до сохранения')
        return
      }
      if (isDraft) {
        setFinanceError('Транзакции недоступны для заявки')
        return
      }
      if (!sourceEventId || !event?.clientId) {
        setFinanceError('Сначала сохраните мероприятие и выберите клиента')
        return
      }
      setFinanceError('')
      if (transactionId)
        modalsFunc.transaction?.edit(sourceEventId, transactionId, {
          contractSum,
        })
      else modalsFunc.transaction?.add(sourceEventId, { contractSum })
    }

    const openContractTemplateModal = () => {
      const settingsRef = { current: siteSettings }
      const currentLastNumber = Number(siteSettings?.custom?.contractLastNumber)
      const nextDefaultNumber =
        Number.isFinite(currentLastNumber) && currentLastNumber > 0
          ? currentLastNumber + 1
          : 1
      const now = new Date()
      const defaultContractDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const numberRef = { current: String(nextDefaultNumber) }
      const dateRef = { current: defaultContractDate }

      const updateLastContractNumber = async (value) => {
        const parsed = Number(String(value ?? '').trim())
        if (!Number.isFinite(parsed) || parsed <= 0) return
        const currentSettings = settingsRef.current
        const previous = Number(currentSettings?.custom?.contractLastNumber)
        if (Number.isFinite(previous) && previous >= parsed) return
        await postData(
          '/api/site',
          {
            custom: {
              ...(currentSettings?.custom ?? {}),
              contractLastNumber: parsed,
            },
          },
          (data) => setSiteSettings(data),
          null,
          false,
          loggedUser?._id
        )
      }

      const ContractTemplatePreview = () => {
        const liveSiteSettings = useAtomValue(siteSettingsAtom)
        const [contractNumber, setContractNumber] = useState(
          String(nextDefaultNumber)
        )
        const [contractDate, setContractDate] = useState(defaultContractDate)
        const templateText = buildContractTemplateText(
          contractNumber,
          contractDate,
          liveSiteSettings
        )

        useEffect(() => {
          numberRef.current = contractNumber
        }, [contractNumber])
        useEffect(() => {
          dateRef.current = contractDate
        }, [contractDate])
        useEffect(() => {
          settingsRef.current = liveSiteSettings
        }, [liveSiteSettings])

        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-2">
              <div className="mt-1.5 flex items-end gap-2">
                <Input
                  label="№ договора"
                  value={contractNumber}
                  onChange={setContractNumber}
                  type="number"
                  min={1}
                  noMargin
                  className="w-[104px]"
                  inputClassName="hide-number-spin w-[35px]"
                />
                <Input
                  label="Дата договора"
                  value={contractDate}
                  onChange={setContractDate}
                  type="date"
                  noMargin
                  className="w-[150px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <AppButton
                  variant="secondary"
                  size="sm"
                  className="rounded cursor-pointer"
                  onClick={() =>
                    modalsFunc.settings?.contractTemplateEditor?.()
                  }
                >
                  Редактор шаблона договора
                </AppButton>
              </div>
            </div>
            <pre className="max-h-[65dvh] overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs leading-5 whitespace-pre-wrap text-gray-800">
              {templateText}
            </pre>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-gray-700 transition border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
              onClick={async () => {
                if (!navigator?.clipboard) return
                navigator.clipboard.writeText(templateText)
                await updateLastContractNumber(contractNumber)
              }}
            >
              Скопировать текст
            </button>
          </div>
        )
      }
      const clientName = getPersonFullName(selectedClient, {
        separator: '_',
        fallback: 'client',
      })
      const contractFileName = `dogovor_${clientName || 'client'}_${new Date()
        .toISOString()
        .slice(0, 10)}.docx`
      modalsFunc.add({
        title: 'Шаблон договора',
        confirmButtonName: 'Скачать Word (.docx)',
        declineButtonName: 'Закрыть',
        showDecline: true,
        onConfirm: async () => {
          const contractNumber = numberRef.current
          const contractDate = dateRef.current
          const text = buildContractTemplateText(
            contractNumber,
            contractDate,
            settingsRef.current,
            'docx'
          )
          await exportContractTemplateDocx(text, contractFileName)
          await updateLastContractNumber(contractNumber)
        },
        Children: ContractTemplatePreview,
      })
    }

    return (
      <TabContext
        value="Общие"
        variant="fullWidth"
        scrollButtons={false}
        allowScrollButtonsMobile={false}
      >
        <TabPanel tabName="Общие">
          <FormWrapper>
            {!eventId && (
              <InputWrapper label="Тип" paddingY fitWidth>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'draft', label: 'Заявка' },
                    { value: 'active', label: 'Мероприятие' },
                  ].map((item) => {
                    const isActive = status === item.value
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`focus-visible:ring-general inline-flex min-h-[32px] items-center rounded border px-3 py-1 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${getEventStatusButtonClasses(
                          item.value,
                          isActive
                        )} ${isActive ? 'shadow' : 'shadow-sm'} cursor-pointer`}
                        onClick={() => setStatus(item.value)}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </InputWrapper>
            )}
            <ServiceMultiSelect
              value={servicesIds}
              onChange={setServicesIds}
              onCreate={openServiceCreateModal}
              error={errors.servicesIds}
              required
              onClearError={() => removeError('servicesIds')}
            />

            <div className="flex flex-wrap items-center gap-x-1">
              <DateTimePicker
                value={eventDate}
                onChange={(value) => {
                  removeError('eventDate')
                  const nextStart = value ?? null
                  setDateEnd(
                    (prevEnd) =>
                      shiftEndByStartChange(eventDate, nextStart, prevEnd) ??
                      prevEnd
                  )
                  setEventDate(nextStart)
                }}
                label="Дата начала"
                error={errors.eventDate}
              />
              <DateTimePicker
                value={dateEnd}
                onChange={(value) => {
                  setDateEndTouched(true)
                  setDateEnd(value ?? null)
                }}
                label="Дата окончания"
              />
            </div>
            <AddressPicker
              address={address}
              onChange={setAddress}
              label="Локация"
              required={false}
              errors={errors}
              townOptions={townOptions}
              onCreateTown={handleCreateTown}
            />
            <Textarea
              label="Комментарий"
              onChange={setDescription}
              value={description}
              rows={3}
            />
            <IconCheckBox
              checked={isTransferred}
              onClick={() => {
                setIsTransferred((prev) => !prev)
                removeError('colleagueId')
              }}
              label="Передано коллеге"
              checkedIcon={faCircleCheck}
              checkedIconColor="#F97316"
            />
            {isTransferred && (
              <ColleaguePicker
                selectedColleague={selectedColleague}
                selectedColleagueId={colleagueId}
                onSelectClick={openColleagueSelectModal}
                label="Коллега"
                required={isTransferred}
                error={errors.colleagueId}
                compact
                paddingY
                fullWidth
              />
            )}
            {!calendarImportChecked && (
              <IconCheckBox
                checked={calendarImportChecked}
                onClick={() => setCalendarImportChecked(true)}
                label={
                  importedFromCalendar
                    ? 'Импорт из календаря проверен'
                    : 'Проверка мероприятия завершена'
                }
                checkedIcon={faCircleCheck}
                checkedIconColor="#10B981"
              />
            )}
            <DateTimePicker
              value={requestCreatedAt}
              onChange={(value) => setRequestCreatedAt(value ?? null)}
              label="Дата заявки"
            />
            <ErrorsList errors={errors} />
          </FormWrapper>
        </TabPanel>

        <TabPanel tabName="Клиент и Контакты">
          <FormWrapper>
            <ClientPicker
              selectedClient={selectedClient}
              selectedClientId={clientId}
              onSelectClick={openClientSelectModal}
              onViewClick={() => modalsFunc.client?.view(clientId)}
              onCreateClick={() =>
                modalsFunc.client?.add((newClient) => {
                  if (!newClient?._id) return
                  setClientId(newClient._id)
                  removeError('clientId')
                })
              }
              label="Клиент"
              required
              error={errors.clientId}
              paddingY
              fullWidth
              compact
            />
            <OtherContactsPicker
              contacts={otherContacts}
              clients={clients}
              onSelectContact={handleOtherContactSelect}
              onChangeComment={handleOtherContactCommentChange}
              onRemoveContact={handleOtherContactRemove}
              onEditContact={(index) => {
                const contact = otherContacts[index]
                if (contact?.clientId) modalsFunc.client?.edit(contact.clientId)
              }}
              onAddContact={handleOtherContactAdd}
            />
            <InputWrapper label="Доп. события">
              <div className="flex flex-col w-full gap-2">
                <div className="flex justify-end w-full">
                  <AddIconButton
                    onClick={() => handleAdditionalEventAdd()}
                    title="Добавить событие"
                    size="sm"
                  />
                </div>
                {hasDoneAdditionalEvents ? (
                  <IconCheckBox
                    checked={showDoneAdditionalEvents}
                    onClick={() => setShowDoneAdditionalEvents((prev) => !prev)}
                    label="Показывать выполненные"
                    checkedIcon={faCircleCheck}
                    checkedIconColor="#16A34A"
                    noMargin
                  />
                ) : null}

                {additionalEvents.length ===
                0 ? null : filteredAdditionalEvents.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    Нет событий для выбранного фильтра
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 laptop:grid-cols-3">
                    {filteredAdditionalEvents.map(({ item, index }) => (
                      <div
                        key={`additional-event-${index}`}
                        className={`w-full rounded border p-2 ${
                          item?.done
                            ? 'border-emerald-200 bg-emerald-50/70'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div
                              className={`truncate text-sm font-semibold ${
                                item?.done
                                  ? 'text-emerald-700'
                                  : 'text-gray-900'
                              }`}
                            >
                              {item?.done ? '✓ ' : ''}
                              {item?.title || `Событие #${index + 1}`}
                            </div>
                            <div className="text-xs text-gray-600">
                              {item?.date
                                ? new Date(item.date).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Дата не указана'}
                            </div>
                            {item?.description ? (
                              <div className="text-xs text-gray-700">
                                {item.description}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <AppButton
                              variant={item?.done ? 'secondary' : 'primary'}
                              size="sm"
                              className="rounded"
                              onClick={() =>
                                handleAdditionalEventToggleDone(index)
                              }
                            >
                              {item?.done ? 'Вернуть' : 'Сделано'}
                            </AppButton>
                            <IconActionButton
                              icon={faPencilAlt}
                              onClick={() => handleAdditionalEventEdit(index)}
                              title="Редактировать событие"
                              variant="warning"
                              size="xs"
                              className="min-h-8 min-w-8"
                            />
                            <IconActionButton
                              icon={faTrashAlt}
                              onClick={() => handleAdditionalEventRemove(index)}
                              title="Удалить событие"
                              variant="danger"
                              size="xs"
                              className="min-h-8 min-w-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </InputWrapper>
          </FormWrapper>
        </TabPanel>

        <TabPanel tabName="Финансы и Документы">
          <div className="flex flex-col gap-2">
            <Input
              label="Договорная сумма"
              type="number"
              value={contractSum}
              onChange={setContractSum}
              min={0}
              step={1000}
              noMargin
            />
            {!hasDepositTransaction ? (
              <div className="flex flex-col gap-2">
                <IconCheckBox
                  checked={waitDeposit}
                  onClick={() =>
                    setWaitDeposit((prev) => {
                      const next = !prev
                      if (!next) setDepositDueAt(null)
                      return next
                    })
                  }
                  label="Ждем задаток"
                  checkedIcon={faCircleCheck}
                  checkedIconColor="#F97316"
                  noMargin
                />
                {waitDeposit ? (
                  <DateTimePicker
                    value={depositDueAt}
                    onChange={(value) => setDepositDueAt(value ?? null)}
                    label="Дата ожидания задатка"
                    noMargin
                    className="mt-1"
                  />
                ) : null}
              </div>
            ) : null}
            <Textarea
              label="Комментарий по финансам"
              value={financeComment}
              onChange={setFinanceComment}
              rows={2}
              wrapperClassName="mt-2"
              noMargin
            />
            <IconCheckBox
              checked={isByContract}
              onClick={() => setIsByContract((prev) => !prev)}
              label="По договору"
              checkedIcon={faCircleCheck}
              checkedIconColor="#2563EB"
              noMargin
            />
            {isByContract && (
              <div className="flex items-center gap-3">
                <AppButton
                  variant="secondary"
                  size="sm"
                  className="rounded"
                  onClick={openContractTemplateModal}
                >
                  Сформировать договор
                </AppButton>
                <div className="text-xs text-red-600">
                  Необходимо заполнить реквизиты в карточке клиента
                </div>
              </div>
            )}
            {isDraft ? (
              <div className="px-3 py-2 text-sm border rounded-md border-amber-200 bg-amber-50 text-amber-800">
                {`Для заявки финансы, транзакции и документы недоступны. Переведите статус в "Активно"`}
              </div>
            ) : null}
            {isByContract && !isDraft && (
              <div className="mt-2 flex flex-col gap-2.5">
                <LinksListEditor
                  label="Ссылки на договора"
                  links={contractLinks}
                  onChange={setContractLinks}
                  noMargin
                />
                <LinksListEditor
                  label="Ссылки на счета"
                  links={invoiceLinks}
                  onChange={setInvoiceLinks}
                  noMargin
                />
                <LinksListEditor
                  label="Ссылки на чеки"
                  links={receiptLinks}
                  onChange={setReceiptLinks}
                  noMargin
                />
                <LinksListEditor
                  label="Ссылки на акты"
                  links={actLinks}
                  onChange={setActLinks}
                  noMargin
                />
              </div>
            )}

            {!isDraft && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-gray-900">
                    Транзакции
                  </div>
                  <AddIconButton
                    onClick={() => openTransactionModal()}
                    disabled={
                      isDraft ||
                      clone ||
                      financeLoading ||
                      !sourceEventId ||
                      !event?.clientId
                    }
                    title="Добавить транзакцию"
                    size="sm"
                    className="disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {financeError && (
                  <div className="px-3 py-2 text-sm text-red-700 border border-red-200 rounded-md bg-red-50">
                    {financeError}
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded shadow-sm">
                  {eventTransactions.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500">
                      Транзакции не найдены
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Поступления
                      </div>
                      {incomeTransactions.length === 0 ? (
                        <div className="px-3 pb-3 text-sm text-gray-500">
                          Поступлений нет
                        </div>
                      ) : (
                        incomeTransactions.map((transaction) => (
                          <div
                            key={transaction._id}
                            className="flex flex-col gap-2 px-3 py-3 laptop:flex-row laptop:items-center laptop:justify-between"
                          >
                            <div className="flex flex-wrap flex-1 gap-3 text-sm">
                              <span className="font-semibold text-gray-900">
                                {transaction.amount.toLocaleString()} руб.
                              </span>
                              <span className="text-emerald-700">
                                {TRANSACTION_TYPES.find(
                                  (item) => item.value === transaction.type
                                )?.name ?? transaction.type}
                              </span>
                              {transaction.category && (
                                <span className="text-gray-600">
                                  {
                                    TRANSACTION_CATEGORIES.find(
                                      (item) =>
                                        item.value === transaction.category
                                    )?.name
                                  }
                                </span>
                              )}
                              <span className="text-gray-600">
                                {transaction.date
                                  ? new Date(transaction.date).toLocaleString(
                                      'ru-RU',
                                      {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )
                                  : ''}
                              </span>
                              {transaction.comment && (
                                <span className="text-gray-700">
                                  {transaction.comment}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <IconActionButton
                                icon={faPencilAlt}
                                onClick={() =>
                                  openTransactionModal(transaction._id)
                                }
                                disabled={financeLoading}
                                title="Редактировать транзакцию"
                                variant="warning"
                                size="sm"
                              />
                              <IconActionButton
                                icon={faTrashAlt}
                                onClick={() =>
                                  handleDeleteTransaction(transaction._id)
                                }
                                disabled={financeLoading}
                                title="Удалить транзакцию"
                                variant="danger"
                                size="sm"
                              />
                            </div>
                          </div>
                        ))
                      )}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Расходы
                      </div>
                      {expenseTransactions.length === 0 ? (
                        <div className="px-3 pb-3 text-sm text-gray-500">
                          Расходов нет
                        </div>
                      ) : (
                        expenseTransactions.map((transaction) => (
                          <div
                            key={transaction._id}
                            className="flex flex-col gap-2 px-3 py-3 laptop:flex-row laptop:items-center laptop:justify-between"
                          >
                            <div className="flex flex-wrap flex-1 gap-3 text-sm">
                              <span className="font-semibold text-gray-900">
                                {transaction.amount.toLocaleString()} руб.
                              </span>
                              <span className="text-red-700">
                                {TRANSACTION_TYPES.find(
                                  (item) => item.value === transaction.type
                                )?.name ?? transaction.type}
                              </span>
                              {transaction.category && (
                                <span className="text-gray-600">
                                  {
                                    TRANSACTION_CATEGORIES.find(
                                      (item) =>
                                        item.value === transaction.category
                                    )?.name
                                  }
                                </span>
                              )}
                              <span className="text-gray-600">
                                {transaction.date
                                  ? new Date(transaction.date).toLocaleString(
                                      'ru-RU',
                                      {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )
                                  : ''}
                              </span>
                              {transaction.comment && (
                                <span className="text-gray-700">
                                  {transaction.comment}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <IconActionButton
                                icon={faPencilAlt}
                                onClick={() =>
                                  openTransactionModal(transaction._id)
                                }
                                disabled={financeLoading}
                                title="Редактировать транзакцию"
                                variant="warning"
                                size="sm"
                              />
                              <IconActionButton
                                icon={faTrashAlt}
                                onClick={() =>
                                  handleDeleteTransaction(transaction._id)
                                }
                                disabled={financeLoading}
                                title="Удалить транзакцию"
                                variant="danger"
                                size="sm"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </TabPanel>
        {googleCalendarResponseText ? (
          <TabPanel tabName="Ответ Google Calendar">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-800">
                Ответ Google Calendar
              </div>
              <button
                type="button"
                className="h-8 px-3 text-xs font-semibold text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => {
                  if (!navigator?.clipboard) return
                  navigator.clipboard.writeText(googleCalendarResponseText)
                }}
              >
                Скопировать
              </button>
            </div>
            <pre className="w-full p-3 overflow-auto text-xs text-gray-800 whitespace-pre-wrap border border-gray-200 rounded max-h-72 bg-gray-50">
              {googleCalendarResponseText}
            </pre>
          </TabPanel>
        ) : null}
      </TabContext>
    )
  }

  return {
    title: `${eventId && !clone ? 'Редактирование' : 'Создание'} мероприятия`,
    confirmButtonName: eventId && !clone ? 'Применить' : 'Создать',
    Children: EventModal,
  }
}

export default eventFunc
