'use client'

import Modal from '@components/Modal'
import Input from '@components/Input'
import Textarea from '@components/Textarea'

export default function LocationModal({
  open,
  title = 'Новая точка',
  locationDraft,
  setLocationDraft,
  saving,
  onClose,
  onSubmit,
  isEdit = false,
}) {
  const handleChange = (field) => (value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setLocationDraft((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }))
    } else {
      setLocationDraft((prev) => ({ ...prev, [field]: value }))
    }
  }

  const footerContent = (
    <div className="flex gap-2">
      {isEdit && (
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold text-gray-700 transition border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
          onClick={onClose}
        >
          Отмена
        </button>
      )}
      <button
        type="button"
        className="px-4 py-2 text-sm font-semibold text-white transition rounded cursor-pointer bg-sky-600 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onSubmit}
        disabled={saving}
      >
        {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить точку'}
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
      <div className="flex flex-col gap-2 pt-1">
        <Input
          label="Название"
          value={locationDraft.title}
          onChange={handleChange('title')}
          placeholder="Зал на Мира"
          fullWidth
          tone="party"
        />
        <div>
          <p className="mb-1 text-sm font-semibold text-sky-700">Адрес</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              label="Город"
              value={locationDraft.address?.town || ''}
              onChange={handleChange('address.town')}
              fullWidth
              tone="party"
            />
            <Input
              label="Улица"
              value={locationDraft.address?.street || ''}
              onChange={handleChange('address.street')}
              fullWidth
              tone="party"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              label="Дом"
              value={locationDraft.address?.house || ''}
              onChange={handleChange('address.house')}
              fullWidth
              tone="party"
            />
            <Input
              label="Зал/комната"
              value={locationDraft.address?.room || ''}
              onChange={handleChange('address.room')}
              fullWidth
              tone="party"
            />
          </div>
          <Textarea
            label="Комментарий"
            value={locationDraft.address?.comment || ''}
            onChange={handleChange('address.comment')}
            fullWidth
            tone="party"
            rows={2}
            placeholder="Например: вход со двора, домофон 12, парковка у шлагбаума"
          />
        </div>
      </div>
    </Modal>
  )
}
