'use client'

import cn from 'classnames'
import { useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { postData } from '@helpers/CRUD'
import {
  formatAddressPoolShort,
  getAddressPoolSignature,
} from '@helpers/addressPool'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import InputWrapper from './InputWrapper'
import ComboBox from './ComboBox'
import Button from './Button'
import IconActionButton from './IconActionButton'
import AddressPicker from './AddressPicker'

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
  poolAddresses: controlledPoolAddresses,
  onSaveAddress,
  tone = 'default',
  fieldsVariant = 'artist',
  outerClassName,
  contentClassName,
  comboBoxLabel = 'Выбрать адрес',
  emptyComboBoxPlaceholder = 'Выберите адрес',
  saveButtonLabel = 'Сохранить в пул',
  savedLabel = '✓ В пуле',
  manualToggleTitles,
}) => {
  const isParty = tone === 'party'
  const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
  const [showManualInput, setShowManualInput] = useState(false)

  const poolAddresses = useMemo(
    () =>
      Array.isArray(controlledPoolAddresses)
        ? controlledPoolAddresses
        : (siteSettings?.addresses ?? []),
    [controlledPoolAddresses, siteSettings?.addresses]
  )

  const poolOptions = useMemo(
    () =>
      poolAddresses.map((addr) => ({
        name: formatAddressPoolShort(addr),
        value: JSON.stringify(addr),
      })),
    [poolAddresses]
  )

  const isAddressInPool = useMemo(() => {
    if (!address) return false
    const addressSignature = getAddressPoolSignature(address)
    return poolAddresses.some(
      (addr) => getAddressPoolSignature(addr) === addressSignature
    )
  }, [address, poolAddresses])

  const currentValue = useMemo(() => {
    if (!address) return null
    return isAddressInPool ? JSON.stringify(address) : null
  }, [address, isAddressInPool])

  const canSaveToPool = useMemo(() => {
    if (!address) return false
    return address.town || address.street || address.house
  }, [address])

  const resolvedComboBoxPlaceholder = useMemo(() => {
    if (!address) return emptyComboBoxPlaceholder
    return formatAddressPoolShort(address)
  }, [address, emptyComboBoxPlaceholder])

  const handleSelectFromPool = (value) => {
    if (!value) {
      onChange?.(null)
      return
    }

    try {
      onChange?.(JSON.parse(value))
    } catch {
      onChange?.(null)
    }
  }

  const handleSaveToPool = async () => {
    if (!address) return

    if (typeof onSaveAddress === 'function') {
      await onSaveAddress(address)
      return
    }

    await postData('/api/site', { addAddress: address }, (data) =>
      setSiteSettings(data)
    )
  }

  return (
    <div className={cn(outerClassName)}>
      <InputWrapper
        label={label}
        labelClassName={labelClassName}
        value={address}
        className={wrapperClassName}
        required={required}
        paddingY={false}
        paddingX="small"
        centerLabel={true}
        tone={tone}
      >
        <div className={cn('mt-0.5 mb-1 min-w-0 flex-1', contentClassName)}>
          <div className="flex flex-col">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2">
              <div className="relative mt-2.5 w-full min-w-0 flex-1">
                <ComboBox
                  label={comboBoxLabel}
                  items={poolOptions}
                  value={currentValue}
                  onChange={handleSelectFromPool}
                  placeholder={resolvedComboBoxPlaceholder}
                  tone={tone}
                  noMargin
                  fullWidth
                  error={errors?.address}
                  className="w-full min-w-0 flex-1"
                  selectClassName="min-w-0 overflow-hidden text-ellipsis truncate"
                />
              </div>
              <IconActionButton
                icon={faPencilAlt}
                onClick={() => setShowManualInput((value) => !value)}
                title={
                  showManualInput
                    ? manualToggleTitles?.collapse || 'Свернуть ввод адреса'
                    : manualToggleTitles?.expand || 'Ввести адрес'
                }
                size="md"
                variant="neutral"
              />
            </div>

            {showManualInput && (
              <div className="flex flex-col">
                <AddressPicker
                  address={address || {}}
                  onChange={onChange}
                  label=""
                  townOptions={townOptions}
                  onCreateTown={onCreateTown}
                  allowTownCreate={allowTownCreate}
                  errors={errors}
                  noWrapper
                  tone={tone}
                  fieldsVariant={fieldsVariant}
                />
                <div className="flex items-center gap-x-2">
                  {canSaveToPool && !isAddressInPool && (
                    <Button
                      name={saveButtonLabel}
                      onClick={handleSaveToPool}
                      thin
                      className="border-general text-general border bg-white hover:bg-green-50"
                      classBgColor="bg-white"
                      classHoverBgColor="hover:bg-green-50"
                    />
                  )}
                  {isAddressInPool && (
                    <span className="text-xs text-green-600">{savedLabel}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </InputWrapper>
    </div>
  )
}

export default AddressPoolPicker
