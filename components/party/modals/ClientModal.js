'use client'

import { useState } from 'react'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import getPersonFullName from '@helpers/getPersonFullName'
import PhoneInput from '@components/PhoneInput'
import Input from '@components/Input'
import Textarea from '@components/Textarea'
import Modal from '@components/Modal'

export function ClientSelectModal({
  open,
  clients,
  onClose,
  onSelect,
  onAddNew,
}) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter((c) => {
    const name = getPersonFullName(c, '').toLowerCase()
    const phone = (c.phone || '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || phone.includes(q)
  })

  const footerContent = (
    <div className="flex gap-2">
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
        onClick={() => {
          onAddNew()
        }}
      >
        + Новый клиент
      </button>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Выбрать клиента"
      tone="party"
      size="full"
      footer={footerContent}
    >
      <div className="flex flex-col gap-2">
        <Input
          placeholder="Поиск по имени или телефону..."
          value={search}
          onChange={setSearch}
          fullWidth
          size="sm"
          tone="party"
          prefix={
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="w-4 h-4 text-gray-400"
            />
          }
        />
        <div className="overflow-auto max-h-72">
          {filtered.length === 0 && (
            <p className="p-2 text-sm text-center text-gray-500">
              Клиенты не найдены
            </p>
          )}
          {filtered.map((client) => (
            <div
              key={client._id}
              className="p-2 border-b border-gray-200 cursor-pointer hover:bg-sky-50"
              onClick={() => {
                onSelect(client)
                onClose()
              }}
            >
              <p className="text-base font-medium">
                {getPersonFullName(client, 'Без имени')}
              </p>
              <p className="text-sm text-gray-500">
                {client.phone ? `+${client.phone}` : 'Телефон не указан'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function ClientFormModal({
  open,
  title = 'Новый клиент',
  clientDraft,
  setClientDraft,
  onClose,
  onSubmit,
  saving,
}) {
  const handleChange = (field) => (value) => {
    setClientDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  const footerContent = (
    <div className="flex gap-2">
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
        disabled={saving}
        onClick={onSubmit}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
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
      <form
        id="client-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <Input
          label="Имя"
          value={clientDraft.firstName}
          onChange={handleChange('firstName')}
          fullWidth
          tone="party"
        />
        <Input
          label="Фамилия"
          value={clientDraft.secondName}
          onChange={handleChange('secondName')}
          fullWidth
          tone="party"
        />
        <Input
          label="Отчество"
          value={clientDraft.thirdName}
          onChange={handleChange('thirdName')}
          fullWidth
          tone="party"
        />
        <PhoneInput
          value={clientDraft.phone}
          onChange={(value) =>
            setClientDraft((prev) => ({ ...prev, phone: value }))
          }
          tone="party"
        />
        <Input
          label="Email"
          value={clientDraft.email}
          onChange={handleChange('email')}
          fullWidth
          tone="party"
        />
        <Textarea
          label="Комментарий"
          value={clientDraft.comment}
          onChange={handleChange('comment')}
          fullWidth
          tone="party"
          rows={3}
        />
      </form>
    </Modal>
  )
}
