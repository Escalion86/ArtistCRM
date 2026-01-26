import ErrorsList from '@components/ErrorsList'
import FormWrapper from '@components/FormWrapper'
import Input from '@components/Input'
import Textarea from '@components/Textarea'
import { DEFAULT_ADDRESS, DEFAULT_REQUEST } from '@helpers/constants'
import useErrors from '@helpers/useErrors'
import itemsFuncAtom from '@state/atoms/itemsFuncAtom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import requestSelector from '@state/selectors/requestSelector'
import DateTimePicker from '@components/DateTimePicker'
import clientsAtom from '@state/atoms/clientsAtom'
import ClientPicker from '@components/ClientPicker'
import { modalsFuncAtom } from '@state/atoms'
import AddressPicker from '@components/AddressPicker'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { postData } from '@helpers/CRUD'
import ServiceMultiSelect from '@components/ServiceMultiSelect'
import serviceFunc from './serviceFunc'
import InputWrapper from '@components/InputWrapper'

const requestFunc = (requestId, clone = false) => {
  const RequestModal = ({
    closeModal,
    setOnConfirmFunc,
    setOnDeclineFunc,
    setOnShowOnCloseConfirmDialog,
    setDisableConfirm,
    setDisableDecline,
    setTopLeftComponent,
    setComponentInFooter,
  }) => {
    const request = useAtomValue(requestSelector(requestId))
    const setRequest = useAtomValue(itemsFuncAtom).request.set
    const clients = useAtomValue(clientsAtom)
    const loggedUser = useAtomValue(loggedUserAtom)
    const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
    const modalsFunc = useAtomValue(modalsFuncAtom)

    const [clientId, setClientId] = useState(
      request?.clientId ?? DEFAULT_REQUEST.clientId ?? null
    )
    const [createdAt, setCreatedAt] = useState(null)
    const [eventDate, setEventDate] = useState(
      DEFAULT_REQUEST.eventDate ?? null
    )
    const [address, setAddress] = useState(DEFAULT_ADDRESS)
    const [contractSum, setContractSum] = useState(
      DEFAULT_REQUEST.contractSum ?? 0
    )
    const [comment, setComment] = useState(DEFAULT_REQUEST.comment ?? '')
    const [yandexAim, setYandexAim] = useState('')
    const [servicesIds, setServicesIds] = useState(
      DEFAULT_REQUEST.servicesIds ?? []
    )
    const [otherContacts, setOtherContacts] = useState(
      DEFAULT_REQUEST.otherContacts ?? []
    )
    const initializedRef = useRef(false)

    const normalizeAddress = useCallback((rawAddress, legacyLocation) => {
      const normalized = {
        ...DEFAULT_ADDRESS,
        ...(rawAddress && typeof rawAddress === 'object' ? rawAddress : {}),
      }

      const hasMainFields =
        normalized.town ||
        normalized.street ||
        normalized.house ||
        normalized.flat

      if (legacyLocation && !normalized.comment && !hasMainFields) {
        normalized.comment = legacyLocation
      }

      return normalized
    }, [])

    const normalizeOtherContacts = useCallback((contacts) => {
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
    }, [])

    const originalValues = useMemo(() => {
      const clientIdValue =
        request?.clientId ?? DEFAULT_REQUEST.clientId ?? null

      const createdAtValue =
        request?.createdAt ??
        (clone || !requestId
          ? new Date().toISOString()
          : DEFAULT_REQUEST.createdAt)

      const eventDateValue =
        request?.eventDate ?? request?.date ?? DEFAULT_REQUEST.eventDate ?? null

      const legacyLocation = [
        request?.town,
        request?.address,
        request?.location,
      ]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .join(', ')

      const addressValue = normalizeAddress(request?.address, legacyLocation)

      if (
        (!requestId || clone) &&
        !addressValue.town &&
        siteSettings?.defaultTown
      ) {
        addressValue.town = siteSettings.defaultTown
      }

      const contractSumValue =
        typeof request?.contractSum === 'number'
          ? request.contractSum
          : typeof DEFAULT_REQUEST.contractSum === 'number'
          ? DEFAULT_REQUEST.contractSum
          : 0

      const commentValue =
        typeof request?.comment === 'string'
          ? request.comment
          : typeof DEFAULT_REQUEST.comment === 'string'
          ? DEFAULT_REQUEST.comment
          : ''

      const yandexAimValue =
        typeof request?.yandexAim === 'string' ? request.yandexAim : ''

      return {
        clientId: clientIdValue,
        createdAt: createdAtValue,
        eventDate: eventDateValue,
        address: addressValue,
        contractSum: contractSumValue,
        comment: commentValue,
        yandexAim: yandexAimValue,
        servicesIds: Array.isArray(request?.servicesIds)
          ? request.servicesIds
          : DEFAULT_REQUEST.servicesIds ?? [],
        otherContacts: normalizeOtherContacts(
          request?.otherContacts ?? DEFAULT_REQUEST.otherContacts ?? []
        ),
      }
    }, [
      normalizeAddress,
      normalizeOtherContacts,
      request,
      clone,
      requestId,
      siteSettings?.defaultTown,
    ])

    useEffect(() => {
      initializedRef.current = false
    }, [requestId, clone])

    useEffect(() => {
      if (initializedRef.current) return
      if (requestId && !request) return
      setClientId(originalValues.clientId)
      setCreatedAt(originalValues.createdAt)
      setEventDate(originalValues.eventDate)
      setAddress(originalValues.address)
      setContractSum(originalValues.contractSum)
      setComment(originalValues.comment)
      setYandexAim(originalValues.yandexAim)
      setServicesIds(originalValues.servicesIds)
      setOtherContacts(originalValues.otherContacts)
      initializedRef.current = true
    }, [clone, originalValues, request, requestId])

    const [errors, , addError, removeError] = useErrors()

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

    const dateRangeError = useMemo(() => {
      if (!createdAt || !eventDate) return ''
      const startDate = new Date(createdAt)
      const endDate = new Date(eventDate)
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      )
        return ''
      return startDate.getTime() > endDate.getTime()
        ? 'Дата начала не может быть позже даты завершения'
        : ''
    }, [createdAt, eventDate])

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
      setOtherContacts((prev) => [
        ...prev,
        { clientId: null, comment: '' },
      ])
    }

    const openClientSelectModal = () => {
      modalsFunc.client?.select((newClientId) => {
        setClientId(newClientId)
        removeError('clientId')
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

    const onClickConfirm = useCallback(async () => {
      let hasCustomError = false

      if (!clientId) {
        addError({ clientId: 'Выберите клиента' })
        hasCustomError = true
      }

      if (!selectedClient?.phone) {
        addError({ clientId: 'У клиента не указан телефон' })
        hasCustomError = true
      }

      if (!eventDate) {
        addError({ eventDate: 'Укажите дату мероприятия' })
        hasCustomError = true
      }
      if (!servicesIds || servicesIds.length === 0) {
        addError({ servicesIds: 'Выберите услугу' })
        hasCustomError = true
      }
      if (dateRangeError) {
        hasCustomError = true
      }

      if (!hasCustomError) {
        closeModal()
        const normalizedAddress = normalizeAddress(address)
        const normalizedContractSum =
          typeof contractSum === 'number' && !Number.isNaN(contractSum)
            ? contractSum
            : 0
        const normalizedCreatedAt =
          createdAt || (clone || !requestId ? new Date().toISOString() : null)
        const normalizedEventDate = eventDate ?? null
        const normalizedOtherContacts = normalizeOtherContacts(otherContacts)
          .map((item) => ({
            clientId: item.clientId ?? null,
            comment: item.comment?.trim() ?? '',
          }))
          .filter((item) => item.clientId)

        const clientNameValue = [
          selectedClient?.firstName,
          selectedClient?.secondName,
        ]
          .filter(Boolean)
          .join(' ')

        setRequest(
          {
            _id: request?._id,
            clientId,
            clientName: clientNameValue || selectedClient?._id,
            clientPhone: selectedClient?.phone ?? null,
            createdAt: normalizedCreatedAt,
            eventDate: normalizedEventDate,
            address: normalizedAddress,
            contractSum: normalizedContractSum,
            comment: comment.trim(),
            yandexAim: yandexAim.trim(),
            servicesIds,
            otherContacts: normalizedOtherContacts,
          },
          clone
        )
      }
    }, [
      request,
      clientId,
      eventDate,
      address,
      contractSum,
      comment,
      yandexAim,
      closeModal,
      setRequest,
      addError,
      selectedClient,
      normalizeAddress,
      normalizeOtherContacts,
      otherContacts,
      dateRangeError,
    ])

    const originalAddressSignature = useMemo(
      () => JSON.stringify(originalValues.address ?? {}),
      [originalValues.address]
    )

    const addressSignature = useMemo(
      () => JSON.stringify(address ?? {}),
      [address]
    )

    const isFormChanged = useMemo(
      () =>
        (originalValues.clientId ?? null) !== (clientId ?? null) ||
        originalValues.createdAt !== createdAt ||
        (originalValues.eventDate ?? null) !== (eventDate ?? null) ||
        originalAddressSignature !== addressSignature ||
        originalValues.contractSum !== contractSum ||
        originalValues.comment !== comment ||
        originalValues.yandexAim !== yandexAim ||
        JSON.stringify(originalValues.servicesIds) !==
          JSON.stringify(servicesIds) ||
        JSON.stringify(originalValues.otherContacts) !==
          JSON.stringify(otherContacts),
      [
        originalValues,
        clientId,
        createdAt,
        eventDate,
        originalAddressSignature,
        addressSignature,
        contractSum,
        comment,
        yandexAim,
        servicesIds,
        otherContacts,
      ]
    )

    const requiredMissing = useMemo(
      () => !clientId || !eventDate || !servicesIds || servicesIds.length === 0,
      [clientId, eventDate, servicesIds]
    )

    const onConfirmRef = useRef(onClickConfirm)

    useEffect(() => {
      onConfirmRef.current = onClickConfirm
    }, [onClickConfirm])

    useEffect(() => {
      setOnConfirmFunc(() => onConfirmRef.current?.())
      setOnShowOnCloseConfirmDialog(isFormChanged)
      setDisableConfirm(!isFormChanged || requiredMissing || !!dateRangeError)
    }, [
      isFormChanged,
      requiredMissing,
      dateRangeError,
      setDisableConfirm,
      setOnShowOnCloseConfirmDialog,
      setOnConfirmFunc,
    ])

    useEffect(() => {
      if (!setComponentInFooter) return
      setComponentInFooter(
        dateRangeError ? (
          <div className="text-sm text-red-600">{dateRangeError}</div>
        ) : null
      )
    }, [dateRangeError, setComponentInFooter])

    return (
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
        />
        <InputWrapper label="Прочие контакты" fullWidth>
          <div className="flex w-full flex-col gap-2">
            {otherContacts.length === 0 && (
              <div className="text-sm text-gray-500">
                Контакты не добавлены
              </div>
            )}
            {otherContacts.map((contact, index) => {
              const contactClient = clients.find(
                (client) => client._id === contact.clientId
              )
              const contactName =
                [contactClient?.firstName, contactClient?.secondName]
                  .filter(Boolean)
                  .join(' ') || 'Выберите клиента'
              return (
                <div
                  key={`other-contact-${index}`}
                  className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 p-2 tablet:flex-row tablet:items-start"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:shadow-card cursor-pointer tablet:flex-1"
                    onClick={() => handleOtherContactSelect(index)}
                  >
                    <span className="font-semibold text-gray-900">
                      {contactName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {contactClient?.phone
                        ? `+${contactClient.phone}`
                        : 'Телефон не указан'}
                    </span>
                  </button>
                  <div className="w-full tablet:flex-1">
                    <Input
                      label="Кем является"
                      value={contact.comment}
                      onChange={(value) =>
                        handleOtherContactCommentChange(index, value)
                      }
                      noMargin
                      fullWidth
                    />
                  </div>
                  <button
                    type="button"
                    className="self-end text-xs font-semibold text-red-600 transition hover:text-red-700 cursor-pointer tablet:self-center"
                    onClick={() => handleOtherContactRemove(index)}
                  >
                    Удалить
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              className="h-9 w-fit rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
              onClick={handleOtherContactAdd}
            >
              Добавить контакт
            </button>
          </div>
        </InputWrapper>
        <DateTimePicker
          value={createdAt}
          onChange={(value) => {
            removeError('createdAt')
            setCreatedAt(value ?? null)
          }}
          label="Дата заявки"
          error={errors.createdAt}
        />
        <DateTimePicker
          value={eventDate}
          onChange={(value) => {
            removeError('eventDate')
            setEventDate(value ?? null)
          }}
          label="Дата мероприятия"
          error={errors.eventDate}
        />
        <AddressPicker
          address={address}
          onChange={setAddress}
          label="Локация"
          required={false}
          errors={errors}
          townOptions={townOptions}
          onCreateTown={handleCreateTown}
        />
        <Input
          label="Договорная сумма"
          type="number"
          value={contractSum}
          onChange={setContractSum}
          min={0}
          step={1000}
        />
        <Textarea
          label="Комментарий"
          onChange={setComment}
          value={comment}
          rows={3}
        />
        <ErrorsList errors={errors} />
      </FormWrapper>
    )
  }

  return {
    title: `${requestId && !clone ? 'Редактирование' : 'Создание'} заявки`,
    confirmButtonName: requestId && !clone ? 'Применить' : 'Создать',
    Children: RequestModal,
  }
}

export default requestFunc
