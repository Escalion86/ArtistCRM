'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSetAtom } from 'jotai'
import {
  ClientSelectModal,
  ClientFormModal,
} from '@components/party/modals/ClientModal'
import { ServiceCreateModal } from '@components/party/modals/ServiceModal'
import ClientPicker from '@components/ClientPicker'
import Modal from '@components/Modal'
import Input from '@components/Input'
import Select from '@components/Select'
import DateTimePicker from '@components/DateTimePicker'
import Textarea from '@components/Textarea'
import ServiceMultiSelect from '@components/ServiceMultiSelect'
import partyServicesAtom from '@state/atoms/partyServicesAtom'
import {
  EMPTY_PARTY_ADDITIONAL_EVENT,
  EMPTY_PARTY_CLIENT,
  EMPTY_PARTY_SERVICE,
  EMPTY_PARTY_TRANSACTION,
  partyPaymentMethodOptions,
  partyTransactionCategoryOptions,
  partyTransactionTypeOptions,
} from '@helpers/partyHelpers'

const specializationLabels = {
  animator: 'Аниматор',
  magician: 'Фокусник',
  host: 'Ведущий',
  photographer: 'Фотограф',
  workshop: 'Мастер-класс',
  other: 'Другое',
}

export default function OrderModal({
  open,
  title = 'Новый заказ',
  orderDraft,
  setOrderDraft,
  locations,
  staff,
  clients,
  clientsById,
  services,
  activeCompanyId,
  canManage,
  saving,
  conflictInfo,
  onClose,
  onSubmit,
  onCheckConflicts,
  onSelectClient,
  onCreateClient,
  onEditClient,
  onServiceCreated,
  isEdit,
}) {
  const [clientModal, setClientModal] = useState('')
  const [clientDraft, setClientDraft] = useState(EMPTY_PARTY_CLIENT)
  const [clientSaving, setClientSaving] = useState(false)

  const [serviceModal, setServiceModal] = useState(false)
  const [serviceDraft, setServiceDraft] = useState(EMPTY_PARTY_SERVICE)
  const [serviceSaving, setServiceSaving] = useState(false)

  const setPartyServices = useSetAtom(partyServicesAtom)

  const selectedClient = orderDraft.clientId
    ? (clientsById.get(String(orderDraft.clientId)) ?? null)
    : null

  const requestHeaders = useMemo(
    () =>
      activeCompanyId
        ? {
            'Content-Type': 'application/json',
            'x-partycrm-company-id': activeCompanyId,
          }
        : { 'Content-Type': 'application/json' },
    [activeCompanyId]
  )

  const handleChange = useCallback((field, value) => {
    setOrderDraft((prev) => ({ ...prev, [field]: value }))
  }, [setOrderDraft])

  const handleTransactionChange = useCallback((index, field, value) => {
    setOrderDraft((prev) => ({
      ...prev,
      transactions: (prev.transactions || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }, [setOrderDraft])

  const handleAddTransaction = useCallback(() => {
    setOrderDraft((prev) => ({
      ...prev,
      transactions: [
        ...(prev.transactions || []),
        { ...EMPTY_PARTY_TRANSACTION, date: new Date().toISOString() },
      ],
    }))
  }, [setOrderDraft])

  const handleRemoveTransaction = useCallback((index) => {
    setOrderDraft((prev) => ({
      ...prev,
      transactions: (prev.transactions || []).filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }))
  }, [setOrderDraft])

  const handleAdditionalEventChange = useCallback((index, field, value) => {
    setOrderDraft((prev) => ({
      ...prev,
      additionalEvents: (prev.additionalEvents || []).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
              ...(field === 'done'
                ? { doneAt: value ? new Date().toISOString() : null }
                : {}),
            }
          : item
      ),
    }))
  }, [setOrderDraft])

  const handleAddAdditionalEvent = useCallback(() => {
    setOrderDraft((prev) => ({
      ...prev,
      additionalEvents: [
        ...(prev.additionalEvents || []),
        { ...EMPTY_PARTY_ADDITIONAL_EVENT },
      ],
    }))
  }, [setOrderDraft])

  const handleRemoveAdditionalEvent = useCallback((index) => {
    setOrderDraft((prev) => ({
      ...prev,
      additionalEvents: (prev.additionalEvents || []).filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }))
  }, [setOrderDraft])

  const handleStaffToggle = useCallback((staffId, checked) => {
    setOrderDraft((prev) => {
      const current = prev.assignedStaff || []
      if (checked) {
        return {
          ...prev,
          assignedStaff: [...current, { staffId, payoutAmount: '' }],
        }
      }
      return {
        ...prev,
        assignedStaff: current.filter((s) => s.staffId !== staffId),
      }
    })
  }, [setOrderDraft])

  const handlePayoutChange = useCallback((staffId, value) => {
    setOrderDraft((prev) => ({
      ...prev,
      assignedStaff: (prev.assignedStaff || []).map((s) =>
        s.staffId === staffId ? { ...s, payoutAmount: value } : s
      ),
    }))
  }, [setOrderDraft])

  const handleClientSelect = useCallback((client) => {
    setOrderDraft((prev) => ({ ...prev, clientId: client._id }))
  }, [setOrderDraft])

  const handleClientCreate = useCallback(async () => {
    setClientSaving(true)
    try {
      const response = await fetch('/api/party/clients', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(clientDraft),
      })
      const data = await response.json()
      if (data.data) {
        setOrderDraft((prev) => ({ ...prev, clientId: data.data._id }))
      }
    } finally {
      setClientSaving(false)
      setClientModal('')
    }
  }, [clientDraft, requestHeaders, setOrderDraft])

  const handleClientEdit = useCallback(async () => {
    if (!orderDraft.clientId) return
    setClientSaving(true)
    try {
      await fetch(`/api/party/clients/${orderDraft.clientId}`, {
        method: 'PATCH',
        headers: requestHeaders,
        body: JSON.stringify(clientDraft),
      })
    } finally {
      setClientSaving(false)
      setClientModal('')
    }
  }, [clientDraft, orderDraft.clientId, requestHeaders])

  const handleServiceCreate = useCallback(async () => {
    setServiceSaving(true)
    try {
      const response = await fetch('/api/party/services', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(serviceDraft),
      })
      const data = await response.json()
      if (data.data) {
        setPartyServices((prev) => [...prev, data.data])
        setOrderDraft((prev) => ({
          ...prev,
          servicesIds: [...(prev.servicesIds || []), data.data._id],
        }))
        if (onServiceCreated) {
          onServiceCreated(data.data)
        }
      }
    } finally {
      setServiceSaving(false)
      setServiceModal(false)
    }
  }, [
    onServiceCreated,
    requestHeaders,
    serviceDraft,
    setOrderDraft,
    setPartyServices,
  ])

  // Footer with action buttons
  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <div>
        {conflictInfo ? (
          <p className="text-sm text-gray-500">{conflictInfo}</p>
        ) : (
          <button
            type="button"
            className="cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            onClick={onCheckConflicts}
            disabled={saving}
          >
            Проверить конфликты
          </button>
        )}
      </div>
      <div className="flex flex-row gap-1">
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold text-gray-700 transition border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold text-white transition rounded cursor-pointer bg-sky-600 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSubmit}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить заказ'}
        </button>
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      tone="party"
      size="full"
      footer={footerContent}
    >
      <div className="flex flex-col gap-3 py-3">
        {/* Основное */}
        <div>
          <p className="mb-1 text-sm font-semibold uppercase text-sky-700">
            Основное
          </p>
          <p className="mb-0.5 text-base font-bold">
            Клиент и параметры заказа
          </p>
          <p className="mb-2 text-sm text-gray-500">
            Сначала укажите, для кого заказ и что именно нужно провести.
          </p>
          <div className="flex flex-col gap-2">
            <Input
              label="Название"
              value={orderDraft.title}
              onChange={(val) => handleChange('title', val)}
              placeholder="День рождения"
              fullWidth
              tone="party"
            />
            <div>
              <ClientPicker
                label="Клиент"
                selectedClient={selectedClient}
                selectedClientId={orderDraft.clientId || null}
                onSelectClick={() => setClientModal('select')}
                onCreateClick={() => {
                  setClientDraft(EMPTY_PARTY_CLIENT)
                  setClientModal('create')
                }}
                onEditClick={() => {
                  if (selectedClient) {
                    setClientDraft(selectedClient)
                  }
                  setClientModal('edit')
                }}
                compact
                fullWidth
                tone="party"
              />
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <DateTimePicker
                label="Дата и время"
                value={orderDraft.eventDate}
                onChange={(val) => handleChange('eventDate', val)}
                tone="party"
                required
              />
              <Input
                label="Длительность, мин"
                type="number"
                value={orderDraft.durationMinutes}
                onChange={(val) => handleChange('durationMinutes', val)}
                tone="party"
              />
            </div>
            <ServiceMultiSelect
              value={orderDraft.servicesIds || []}
              onChange={(val) => handleChange('servicesIds', val)}
              atom={partyServicesAtom}
              onCreate={() => setServiceModal(true)}
              required
              tone="party"
            />
          </div>
        </div>

        <hr className="border-t border-gray-200" />

        {/* Локация и деньги */}
        <div>
          <p className="mb-1 text-sm font-semibold uppercase text-sky-700">
            Локация и деньги
          </p>
          <p className="mb-0.5 text-base font-bold">
            Место проведения и оплата
          </p>
          <p className="mb-2 text-sm text-gray-500">
            Поведение совпадает с PartyCRM: заказ может быть на точке компании
            или на выезде.
          </p>
          <div className="flex flex-col gap-2">
            <Select
              label="Место"
              value={orderDraft.placeType}
              onChange={(val) => {
                handleChange('placeType', val)
                if (val === 'company_location') {
                  handleChange('locationId', orderDraft.locationId || '')
                } else {
                  handleChange('locationId', '')
                }
              }}
              options={[
                { value: 'company_location', label: 'Точка компании' },
                { value: 'client_address', label: 'Выезд к клиенту' },
              ]}
              fullWidth
              tone="party"
            />

            {orderDraft.placeType === 'company_location' ? (
              <Select
                label="Точка"
                value={orderDraft.locationId}
                onChange={(val) => handleChange('locationId', val)}
                options={[
                  { value: '', label: 'Без точки' },
                  ...locations.map((loc) => ({
                    value: loc._id,
                    label: loc.title,
                  })),
                ]}
                fullWidth
                tone="party"
              />
            ) : (
              <Input
                label="Адрес клиента"
                value={orderDraft.customAddress}
                onChange={(val) => handleChange('customAddress', val)}
                fullWidth
                tone="party"
              />
            )}

            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                label="Сумма клиента"
                type="number"
                value={orderDraft.clientPayment.totalAmount}
                onChange={(val) =>
                  handleClientPaymentChange('totalAmount', val)
                }
                fullWidth
                tone="party"
                postfix="₽"
              />
              <Input
                label="Предоплата"
                type="number"
                value={orderDraft.clientPayment.prepaidAmount}
                onChange={(val) =>
                  handleClientPaymentChange('prepaidAmount', val)
                }
                fullWidth
                tone="party"
                postfix="₽"
              />
              <Select
                label="Статус оплаты"
                value={orderDraft.clientPayment.status}
                onChange={(val) => handleClientPaymentChange('status', val)}
                options={Object.entries(paymentStatusLabels).map(
                  ([value, label]) => ({
                    value,
                    label,
                  })
                )}
                className="min-w-48"
                tone="party"
              />
            </div>
          </div>
        </div>

        <hr className="border-t border-gray-200" />

        {/* Команда */}
        <div>
          <p className="mb-1 text-sm font-semibold uppercase text-sky-700">
            Команда
          </p>
          <p className="mb-0.5 text-base font-bold">Исполнители и выплаты</p>
          <p className="mb-2 text-sm text-gray-500">
            Назначьте людей на заказ и сразу зафиксируйте плановые выплаты.
          </p>
          {staff.filter((p) => p.role !== 'owner').length === 0 && (
            <p className="mb-2 text-sm text-gray-500">
              Добавьте исполнителей в блоке сотрудников ниже.
            </p>
          )}
          <div className="flex flex-col gap-1">
            {staff
              .filter((p) => p.role !== 'owner')
              .map((person) => {
                const assigned = (orderDraft.assignedStaff || []).find(
                  (s) => s.staffId === person._id
                )
                const displayName =
                  [person.secondName, person.firstName]
                    .filter(Boolean)
                    .join(' ') ||
                  person.phone ||
                  person.email ||
                  'Без имени'
                return (
                  <div
                    key={person._id}
                    className={`rounded-2xl border border-gray-200 p-2 ${
                      assigned ? 'bg-sky-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-row items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!assigned}
                        onChange={(e) =>
                          handleStaffToggle(person._id, e.target.checked)
                        }
                        className="cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{displayName}</p>
                        {person.specialization && (
                          <span className="inline-block rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                            {specializationLabels[person.specialization] ||
                              person.specialization}
                          </span>
                        )}
                      </div>
                      {assigned && (
                        <Input
                          label="Выплата"
                          type="number"
                          value={assigned.payoutAmount}
                          onChange={(val) =>
                            handlePayoutChange(person._id, val)
                          }
                          className="w-36"
                          tone="party"
                          postfix="₽"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Client Modals */}
      <ClientSelectModal
        open={clientModal === 'select'}
        clients={clients}
        onClose={() => setClientModal('')}
        onSelect={handleClientSelect}
        onAddNew={() => {
          setClientDraft(EMPTY_PARTY_CLIENT)
          setClientModal('create')
        }}
      />

      <ClientFormModal
        open={clientModal === 'create'}
        title="Новый клиент"
        clientDraft={clientDraft}
        setClientDraft={setClientDraft}
        onClose={() => setClientModal('')}
        onSubmit={handleClientCreate}
        saving={clientSaving}
      />

      <ClientFormModal
        open={clientModal === 'edit'}
        title="Редактировать клиента"
        clientDraft={clientDraft}
        setClientDraft={setClientDraft}
        onClose={() => setClientModal('')}
        onSubmit={handleClientEdit}
        saving={clientSaving}
      />

      <ServiceCreateModal
        open={serviceModal}
        serviceDraft={serviceDraft}
        setServiceDraft={setServiceDraft}
        onClose={() => setServiceModal(false)}
        onSubmit={handleServiceCreate}
        saving={serviceSaving}
      />
    </Modal>
  )
}
