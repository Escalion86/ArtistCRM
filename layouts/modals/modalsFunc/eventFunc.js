import DateTimePicker from '@components/DateTimePicker'
import ErrorsList from '@components/ErrorsList'
import FormWrapper from '@components/FormWrapper'
import IconCheckBox from '@components/IconCheckBox'
import Textarea from '@components/Textarea'
import EventStatusPicker from '@components/ValuePicker/EventStatusPicker'
import { faCircleCheck, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
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
import TabContext from '@components/Tabs/TabContext'
import TabPanel from '@components/Tabs/TabPanel'
import transactionsAtom from '@state/atoms/transactionsAtom'
import { deleteData, postData } from '@helpers/CRUD'
import useErrors from '@helpers/useErrors'
import clientsAtom from '@state/atoms/clientsAtom'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { modalsFuncAtom } from '@state/atoms'
import eventSelector from '@state/selectors/eventSelector'
import requestSelector from '@state/selectors/requestSelector'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import Input from '@components/Input'
import AddressPicker from '@components/AddressPicker'
import InputWrapper from '@components/InputWrapper'
import OtherContactsPicker from '@components/OtherContactsPicker'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import ServiceMultiSelect from '@components/ServiceMultiSelect'
import serviceFunc from './serviceFunc'

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

const eventFunc = (eventId, clone = false, requestId = null) => {
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
    const request = useAtomValue(requestSelector(requestId))
    const itemsFunc = useAtomValue(itemsFuncAtom)
    const setEvent = itemsFunc?.event?.set
    const convertRequest = itemsFunc?.request?.convert
    const clients = useAtomValue(clientsAtom)
    const loggedUser = useAtomValue(loggedUserAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    const colleagues = useMemo(
      () => clients.filter((client) => client.clientType === 'colleague'),
      [clients]
    )
    const modalsFunc = useAtomValue(modalsFuncAtom)
    const transactions = useAtomValue(transactionsAtom)
    const setTransactions = useSetAtom(transactionsAtom)
    const closeModalRef = useRef(closeModal)

    const initialIsTransferred =
      event?.isTransferred ??
      (event?.colleagueId ? true : (DEFAULT_EVENT.isTransferred ?? false))

    const [clientId, setClientId] = useState(
      event?.clientId ?? request?.clientId ?? DEFAULT_EVENT.clientId
    )
    const [status, setStatus] = useState(
      event?.status ?? DEFAULT_EVENT.status
    )
    const [eventDate, setEventDate] = useState(
      event?.eventDate ?? request?.eventDate ?? DEFAULT_EVENT.eventDate
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
    const [address, setAddress] = useState(() => {
      const normalized = normalizeAddressValue(
        event?.address ?? request?.address
      )

      if (
        !normalized.town &&
        siteSettings?.defaultTown &&
        !eventId &&
        !request?.address?.town
      ) {
        normalized.town = siteSettings.defaultTown
      }
      return normalized
    })

    const [contractSum, setContractSum] = useState(
      event?.contractSum ??
        request?.contractSum ??
        DEFAULT_EVENT.contractSum ??
        0
    )
    const [isByContract, setIsByContract] = useState(
      event?.isByContract ?? DEFAULT_EVENT.isByContract ?? false
    )
    const [isTransferred, setIsTransferred] = useState(initialIsTransferred)
    const [colleagueId, setColleagueId] = useState(
      event?.colleagueId ?? DEFAULT_EVENT.colleagueId ?? null
    )
    const [description, setDescription] = useState(
      event?.description ??
        event?.comment ??
        request?.comment ??
        DEFAULT_EVENT.description ??
        ''
    )
    const [financeComment, setFinanceComment] = useState(
      event?.financeComment ?? DEFAULT_EVENT.financeComment ?? ''
    )
    const [calendarImportChecked, setCalendarImportChecked] = useState(
      event?.calendarImportChecked ??
        (eventId ? (DEFAULT_EVENT.calendarImportChecked ?? false) : true)
    )
    const [servicesIds, setServicesIds] = useState(
      event?.servicesIds ??
        request?.servicesIds ??
        DEFAULT_EVENT.servicesIds ??
        []
    )
    const [otherContacts, setOtherContacts] = useState(
      event?.otherContacts ??
        request?.otherContacts ??
        DEFAULT_EVENT.otherContacts ??
        []
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
        clientId:
          event?.clientId ?? request?.clientId ?? DEFAULT_EVENT.clientId,
        status: event?.status ?? DEFAULT_EVENT.status,
        eventDate:
          event?.eventDate ?? request?.eventDate ?? DEFAULT_EVENT.eventDate,
        address: (() => {
          const normalized = normalizeAddressValue(
            event?.address ?? request?.address
          )
          if (
            !normalized.town &&
            siteSettings?.defaultTown &&
            !eventId &&
            !event?.address?.town &&
            !request?.address?.town
          ) {
            normalized.town = siteSettings.defaultTown
          }
          return normalized
        })(),
        contractSum:
          event?.contractSum ??
          request?.contractSum ??
          DEFAULT_EVENT.contractSum,
        isByContract: event?.isByContract ?? DEFAULT_EVENT.isByContract,
        description:
          event?.description ??
          event?.comment ??
          request?.comment ??
          DEFAULT_EVENT.description,
        financeComment: event?.financeComment ?? DEFAULT_EVENT.financeComment,
        dateEnd: event?.dateEnd ?? DEFAULT_EVENT.dateEnd,
        invoiceLinks: event?.invoiceLinks ?? DEFAULT_EVENT.invoiceLinks ?? [],
        receiptLinks: event?.receiptLinks ?? DEFAULT_EVENT.receiptLinks ?? [],
        calendarImportChecked:
          event?.calendarImportChecked ??
          (eventId ? DEFAULT_EVENT.calendarImportChecked : true),
        servicesIds:
          event?.servicesIds ??
          request?.servicesIds ??
          DEFAULT_EVENT.servicesIds ??
          [],
        otherContacts: normalizeOtherContacts(
          event?.otherContacts ??
            request?.otherContacts ??
            DEFAULT_EVENT.otherContacts ??
            []
        ),
        colleagueId: event?.colleagueId ?? DEFAULT_EVENT.colleagueId,
        isTransferred: initialIsTransferred,
      }
    }, [
      event?.clientId,
      event?.status,
      event?.eventDate,
      event?.address,
      event?.contractSum,
      event?.description,
      event?.financeComment,
      event?.comment,
      event?.dateEnd,
      event?.calendarImportChecked,
      event?.colleagueId,
      event?.otherContacts,
      initialIsTransferred,
      requestId,
      request?.clientId,
      request?.clientName,
      request?.eventDate,
      request?.address,
      request?.comment,
      request?.contractSum,
      request?.otherContacts,
      request?.servicesIds,
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
        initialEventValues.status !== status ||
        initialEventValues.eventDate !== eventDate ||
        initialEventValues.dateEnd !== dateEnd ||
        initialAddressSignature !== addressSignature ||
        initialEventValues.contractSum !== contractSum ||
        initialEventValues.isByContract !== isByContract ||
        initialEventValues.isTransferred !== isTransferred ||
        initialEventValues.colleagueId !== colleagueId ||
        initialEventValues.description !== description ||
        initialEventValues.financeComment !== financeComment ||
        JSON.stringify(initialEventValues.invoiceLinks ?? []) !==
          JSON.stringify(invoiceLinks) ||
        JSON.stringify(initialEventValues.receiptLinks ?? []) !==
          JSON.stringify(receiptLinks) ||
        initialEventValues.calendarImportChecked !== calendarImportChecked ||
        JSON.stringify(initialEventValues.servicesIds ?? []) !==
          JSON.stringify(servicesIds) ||
        JSON.stringify(initialEventValues.otherContacts ?? []) !==
          JSON.stringify(otherContacts),
      [
        clientId,
        status,
        eventDate,
        dateEnd,
        initialAddressSignature,
        addressSignature,
        contractSum,
        isByContract,
        isTransferred,
        colleagueId,
        description,
        financeComment,
        invoiceLinks,
        receiptLinks,
        calendarImportChecked,
        servicesIds,
        otherContacts,
        initialEventValues,
      ]
    )

    useEffect(() => {
      setAddress(initialEventValues.address)
    }, [initialEventValues.address])

    const eventTransactions = useMemo(
      () =>
        (transactions ?? [])
          .filter((transaction) => transaction.eventId === event?._id)
          .sort(
            (a, b) =>
              new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
          ),
      [event?._id, transactions]
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
    const hasTaxes = useMemo(
      () => eventTransactions.some((item) => item.category === 'taxes'),
      [eventTransactions]
    )
    const canClose = contractSum <= incomeTotal && (!isByContract || hasTaxes)
    const statusDisabledValues = useMemo(() => {
      if (status === 'closed') return []
      if (!canClose) return ['closed']
      return []
    }, [canClose, status])

    const requiredMissing = useMemo(
      () => !clientId || !eventDate || !servicesIds || servicesIds.length === 0,
      [clientId, eventDate, servicesIds]
    )

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

    const addHourToDate = (value) => {
      if (!value) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      date.setHours(date.getHours() + 1)
      return date.toISOString()
    }

    useEffect(() => {
      if (dateEndTouched) return
      if (!eventDate) return
      if (!dateEnd) {
        setDateEnd(addHourToDate(eventDate))
      }
    }, [dateEnd, dateEndTouched, eventDate])

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

      if (!hasError) {
        if (
          status === 'closed' &&
          !canClose &&
          initialEventValues.status !== 'closed'
        ) {
          addErrorRef.current({
            status: isByContract
              ? 'Закрытие недоступно: нет транзакции Налоги или сумма поступлений меньше договорной'
              : 'Закрытие недоступно: сумма поступлений меньше договорной',
          })
          return
        }
        closeModalRef.current()
        const normalizedContractSum =
          typeof contractSum === 'number' && !Number.isNaN(contractSum)
            ? contractSum
            : 0
        const normalizedInvoiceLinks = normalizeLinksList(invoiceLinks)
        const normalizedReceiptLinks = normalizeLinksList(receiptLinks)
        const normalizedOtherContacts = normalizeOtherContacts(otherContacts)
          .map((item) => ({
            clientId: item.clientId ?? null,
            comment: item.comment?.trim() ?? '',
          }))
          .filter((item) => item.clientId)
        const payload = {
          _id: event?._id,
          clientId,
          requestId: event?.requestId ?? requestId ?? null,
          status,
          isTransferred,
          colleagueId: isTransferred ? colleagueId : null,
          eventDate,
          dateEnd,
          address: normalizeAddressValue(address),
          contractSum: normalizedContractSum,
          isByContract,
          description: description?.trim() ?? '',
          financeComment: financeComment?.trim() ?? '',
          invoiceLinks: normalizedInvoiceLinks,
          receiptLinks: normalizedReceiptLinks,
          calendarImportChecked,
          servicesIds,
          otherContacts: normalizedOtherContacts,
        }
        if (!event?._id && requestId && convertRequest) {
          convertRequest(requestId, payload)
          return
        }
        setEvent(payload, clone)
      }
    }, [
      addErrorRef,
      canClose,
      calendarImportChecked,
      clearErrorsRef,
      clientId,
      clone,
      closeModal,
      colleagueId,
      description,
      contractSum,
      isByContract,
      dateEnd,
      event?._id,
      event?.requestId,
      eventDate,
      isTransferred,
      initialEventValues.status,
      address,
      requestId,
      convertRequest,
      setEvent,
      servicesIds,
      otherContacts,
      status,
      dateRangeError,
    ])

    const onClickConfirmRef = useRef(onClickConfirm)

    useEffect(() => {
      onClickConfirmRef.current = onClickConfirm
    }, [onClickConfirm])

    useEffect(() => {
      setOnShowOnCloseConfirmDialog(isFormChanged)
      setDisableConfirm(!isFormChanged || requiredMissing || !!dateRangeError)
      setOnConfirmFunc(() => onClickConfirmRef.current())
    }, [
      isFormChanged,
      requiredMissing,
      dateRangeError,
      setDisableConfirm,
      setOnConfirmFunc,
      setOnShowOnCloseConfirmDialog,
    ])

    useEffect(() => {
      if (!setComponentInFooter) return
      setComponentInFooter(
        dateRangeError ? (
          <div className="text-sm text-red-600">{dateRangeError}</div>
        ) : null
      )
    }, [dateRangeError, setComponentInFooter])

    const selectedClient = useMemo(
      () =>
        clientId && clients.length
          ? clients.find((client) => client._id === clientId)
          : null,
      [clientId, clients]
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
      setFinanceError('')
      setFinanceLoading(true)
      const response = await deleteData(`/api/transactions/${id}`)
      if (response !== null) {
        setTransactions((prev) => prev.filter((item) => item._id !== id))
      } else {
        setFinanceError('Не удалось удалить транзакцию')
      }
      setFinanceLoading(false)
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

    const openTransactionModal = (transactionId) => {
      if (!event?._id || !event?.clientId) {
        setFinanceError('Сначала сохраните мероприятие и выберите клиента')
        return
      }
      setFinanceError('')
      if (transactionId)
        modalsFunc.transaction?.edit(event._id, transactionId, {
          contractSum,
        })
      else modalsFunc.transaction?.add(event._id, { contractSum })
    }

    return (
      <TabContext value="Общие" variant="fullWidth" scrollButtons={false} allowScrollButtonsMobile={false}>
        <TabPanel tabName="Общие">
          <FormWrapper>
            <ServiceMultiSelect
              value={servicesIds}
              onChange={setServicesIds}
              onCreate={openServiceCreateModal}
              error={errors.servicesIds}
              required
              onClearError={() => removeError('servicesIds')}
            />
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
              onAddContact={handleOtherContactAdd}
            />

            <div className="flex flex-wrap items-center gap-x-1">
              <DateTimePicker
                value={eventDate}
                onChange={(value) => {
                  removeError('eventDate')
                  setEventDate(value ?? null)
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
            <EventStatusPicker
              status={status}
              onChange={setStatus}
              required
              disabledValues={statusDisabledValues}
              error={errors.status}
            />
            {!canClose && (
              <div className="text-xs text-gray-500">
                {isByContract && !hasTaxes
                  ? 'Закрытие недоступно: добавьте транзакцию Налоги.'
                  : 'Закрытие недоступно, пока сумма поступлений меньше договорной.'}
              </div>
            )}
            <ErrorsList errors={errors} />
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
            <Textarea
              label="Комментарий по финансам"
              value={financeComment}
              onChange={setFinanceComment}
              rows={2}
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
              <div className="flex flex-col gap-2">
                <InputWrapper label="Ссылки на счета" noMargin>
                  <div className="flex flex-col gap-2">
                    {invoiceLinks.length === 0 && (
                      <div className="text-sm text-gray-500">
                        Ссылки не добавлены
                      </div>
                    )}
                    {invoiceLinks.map((link, index) => (
                      <div
                        key={`invoice-link-${index}`}
                        className="flex items-center gap-2"
                      >
                        <input
                          className="focus:border-general h-8 w-full rounded border border-gray-200 px-2 text-sm text-gray-900 focus:outline-none"
                          type="text"
                          value={link}
                          placeholder="Введите ссылку"
                          onChange={(event) => {
                            const value = event.target.value
                            setInvoiceLinks((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? value : item
                              )
                            )
                          }}
                        />
                        <button
                          type="button"
                          className="action-icon-button flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-red-200 text-red-600 transition hover:bg-red-50"
                          onClick={() =>
                            setInvoiceLinks((prev) =>
                              prev.filter((_, idx) => idx !== index)
                            )
                          }
                          title="Удалить ссылку"
                        >
                          <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="action-icon-button flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-700"
                      onClick={() => setInvoiceLinks((prev) => [...prev, ''])}
                      title="Добавить ссылку"
                    >
                      <FontAwesomeIcon className="h-4 w-4" icon={faPlus} />
                    </button>
                  </div>
                </InputWrapper>
                <InputWrapper label="Ссылки на чеки" noMargin>
                  <div className="flex flex-col gap-2">
                    {receiptLinks.length === 0 && (
                      <div className="text-sm text-gray-500">
                        Ссылки не добавлены
                      </div>
                    )}
                    {receiptLinks.map((link, index) => (
                      <div
                        key={`receipt-link-${index}`}
                        className="flex items-center gap-2"
                      >
                        <input
                          className="focus:border-general h-8 w-full rounded border border-gray-200 px-2 text-sm text-gray-900 focus:outline-none"
                          type="text"
                          value={link}
                          placeholder="Введите ссылку"
                          onChange={(event) => {
                            const value = event.target.value
                            setReceiptLinks((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? value : item
                              )
                            )
                          }}
                        />
                        <button
                          type="button"
                          className="action-icon-button flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-red-200 text-red-600 transition hover:bg-red-50"
                          onClick={() =>
                            setReceiptLinks((prev) =>
                              prev.filter((_, idx) => idx !== index)
                            )
                          }
                          title="Удалить ссылку"
                        >
                          <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="action-icon-button flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-700"
                      onClick={() => setReceiptLinks((prev) => [...prev, ''])}
                      title="Добавить ссылку"
                    >
                      <FontAwesomeIcon className="h-4 w-4" icon={faPlus} />
                    </button>
                  </div>
                </InputWrapper>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">
                Транзакции
              </div>
              <button
                type="button"
                className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => openTransactionModal()}
                disabled={financeLoading || !event?._id || !event?.clientId}
                title="Добавить транзакцию"
              >
                <FontAwesomeIcon className="h-4 w-4" icon={faPlus} />
              </button>
            </div>

            {financeError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {financeError}
              </div>
            )}

            <div className="rounded border border-gray-200 bg-white shadow-sm">
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
                        className="laptop:flex-row laptop:items-center laptop:justify-between flex flex-col gap-2 px-3 py-3"
                      >
                        <div className="flex flex-1 flex-wrap gap-3 text-sm">
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
                                  (item) => item.value === transaction.category
                                )?.name
                              }
                            </span>
                          )}
                          <span className="text-gray-600">
                            {transaction.date
                              ? new Date(transaction.date).toLocaleString(
                                  'ru-RU'
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
                          <button
                            type="button"
                            className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-orange-600 bg-orange-50 text-orange-500 shadow-sm transition hover:bg-orange-100 hover:text-orange-600"
                            onClick={() =>
                              openTransactionModal(transaction._id)
                            }
                            disabled={financeLoading}
                            title="Редактировать транзакцию"
                          >
                            <FontAwesomeIcon className="h-4 w-4" icon={faPencilAlt} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-red-200 text-red-600 transition hover:bg-red-50"
                            onClick={() =>
                              handleDeleteTransaction(transaction._id)
                            }
                            disabled={financeLoading}
                            title="Удалить транзакцию"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
                          </button>
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
                        className="laptop:flex-row laptop:items-center laptop:justify-between flex flex-col gap-2 px-3 py-3"
                      >
                        <div className="flex flex-1 flex-wrap gap-3 text-sm">
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
                                  (item) => item.value === transaction.category
                                )?.name
                              }
                            </span>
                          )}
                          <span className="text-gray-600">
                            {transaction.date
                              ? new Date(transaction.date).toLocaleString(
                                  'ru-RU'
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
                          <button
                            type="button"
                            className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-orange-600 bg-orange-50 text-orange-500 shadow-sm transition hover:bg-orange-100 hover:text-orange-600"
                            onClick={() =>
                              openTransactionModal(transaction._id)
                            }
                            disabled={financeLoading}
                            title="Редактировать транзакцию"
                          >
                            <FontAwesomeIcon className="h-4 w-4" icon={faPencilAlt} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-red-200 text-red-600 transition hover:bg-red-50"
                            onClick={() =>
                              handleDeleteTransaction(transaction._id)
                            }
                            disabled={financeLoading}
                            title="Удалить транзакцию"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
                className="h-8 rounded border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  if (!navigator?.clipboard) return
                  navigator.clipboard.writeText(googleCalendarResponseText)
                }}
              >
                Скопировать
              </button>
            </div>
            <pre className="max-h-72 w-full overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-800">
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
