'use client'

import InputWrapper from './InputWrapper'
import ComboBox from './ComboBox'
import Button from './Button'
import IconActionButton from './IconActionButton'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { useState, useMemo } from 'react'
import { postData } from '@helpers/CRUD'
import { useAtom } from 'jotai'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import AddressPicker from './AddressPicker'

const formatAddressShort = (address) => {
  if (!address) return ''
  const parts = []
  if (address.town) parts.push(address.town)
  if (address.street) parts.push(address.street)
  if (address.house) parts.push(`д. ${address.house}`)
  if (address.entrance) parts.push(`под. ${address.entrance}`)
  if (address.flat) parts.push(`кв. ${address.flat}`)
  if (parts.length === 0) return address.comment || ''
  return parts.join(', ') + (address.comment ? ` (${address.comment})` : '')
}

const getAddressPoolSignature = (address) =>
  [
    address?.town,
    address?.street,
    address?.house,
    address?.entrance,
    address?.floor,
    address?.flat,
    address?.comment,
  ]
    .map((value) => String(value ?? '').trim())
    .join('|')

const AddressPoolPicker = ({
  address,
  onChange,
  label = 'Адрес',
  labelClassName,
  wrapperClassName,
  errors,
  required,
  townOptions = [],
  onCreateTown,
  allowTownCreate = true,
}) => {
  const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
  const [showManualInput, setShowManualInput] = useState(false)

  const poolAddresses = useMemo(
    () => siteSettings?.addresses ?? [],
    [siteSettings?.addresses]
  )

  const poolOptions = useMemo(() => {
    return poolAddresses.map((addr) => ({
      name: formatAddressShort(addr),
      value: JSON.stringify(addr),
      address: addr,
    }))
  }, [poolAddresses])

  // Проверяем, находится ли адрес в пуле
  const isAddressInPool = useMemo(() => {
    if (!address) return false
    const addressSignature = getAddressPoolSignature(address)
    return poolAddresses.some(
      (addr) => getAddressPoolSignature(addr) === addressSignature
    )
  }, [address, poolAddresses])

  // Текущее значение для ComboBox — всегда показываем выбранный адрес
  const currentValue = useMemo(() => {
    if (!address) return null
    // Если адрес в пуле — используем реальное значение
    if (isAddressInPool) {
      return JSON.stringify(address)
    }
    // Если адрес введён вручную (не в пуле) — возвращаем null,
    // чтобы показать placeholder с текстом адреса
    return null
  }, [address, isAddressInPool])

  // Проверяем, можно ли сохранить в пул
  const canSaveToPool = useMemo(() => {
    if (!address) return false
    return address.town || address.street || address.house
  }, [address])

  // Динамический placeholder для ComboBox
  const comboBoxPlaceholder = useMemo(() => {
    if (!address) return 'Выберите адрес'
    return formatAddressShort(address)
  }, [address])

  const handleSelectFromPool = (value) => {
    if (!value) {
      onChange?.(null)
      return
    }
    try {
      const parsed = JSON.parse(value)
      onChange?.(parsed)
    } catch {
      onChange?.(null)
    }
  }

  const handleToggleManual = () => {
    setShowManualInput((value) => !value)
  }

  const handleSaveToPool = async () => {
    if (!address) return
    const result = await postData(
      '/api/site',
      { addAddress: address },
      (data) => setSiteSettings(data)
    )
    if (result?.success) {
      // Address saved successfully - siteSettings will be updated via callback
    }
  }

  return (
    <InputWrapper
      label={label}
      labelClassName={labelClassName}
      value={address}
      className={wrapperClassName}
      required={required}
      paddingY={false}
      paddingX="small"
      centerLabel={true}
    >
      <div className="mt-0.5 mb-1 min-w-0 flex-1">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-end gap-x-2">
            <div className="relative mt-2.5 w-full min-w-0 flex-1">
              <ComboBox
                label="Выбрать адрес"
                items={poolOptions}
                value={currentValue}
                onChange={handleSelectFromPool}
                placeholder={comboBoxPlaceholder}
                noMargin
                fullWidth
                error={errors?.address}
                className="flex-1 w-full min-w-0"
              />
            </div>
            <IconActionButton
              icon={faPencilAlt}
              onClick={handleToggleManual}
              title={showManualInput ? 'Свернуть ввод адреса' : 'Ввести адрес'}
              size="md"
              variant="neutral"
            />
          </div>

          {showManualInput && (
            <div className="flex flex-col">
              <AddressPicker
                address={address}
                onChange={onChange}
                label=""
                townOptions={townOptions}
                onCreateTown={onCreateTown}
                allowTownCreate={allowTownCreate}
                errors={errors}
                noWrapper
              />
              <div className="flex items-center gap-x-2">
                {canSaveToPool && !isAddressInPool && (
                  <Button
                    name="Сохранить в пул"
                    variant="outlined"
                    size="sm"
                    onClick={handleSaveToPool}
                  />
                )}
                {isAddressInPool && (
                  <span className="text-xs text-green-600">✓ В пуле</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </InputWrapper>
  )
}

export default AddressPoolPicker
