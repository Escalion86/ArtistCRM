'use client'

import cn from 'classnames'
import { useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { postData } from '@helpers/CRUD'
import {
  formatAddressPoolShort,
  getAddressPoolSignature,
} from '@helpers/addressPool'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import InputWrapper from './InputWrapper'
import Button from './Button'
import AddressPicker from './AddressPicker'
import AddressSuggestField from './AddressSuggestField'

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
  saveButtonLabel = 'Сохранить в пул',
  savedLabel = '✓ В пуле',
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

  const formattedAddress = useMemo(
    () => formatAddressPoolShort(address),
    [address]
  )

  const isAddressInPool = useMemo(() => {
    if (!formattedAddress) return false
    const addressSignature = getAddressPoolSignature(address)
    return poolAddresses.some(
      (addr) => getAddressPoolSignature(addr) === addressSignature
    )
  }, [address, formattedAddress, poolAddresses])

  const canSaveToPool = useMemo(() => {
    if (!address) return false
    return address.town || address.street || address.house
  }, [address])

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
        paddingX={false}
        noBorder
        tone={tone}
      >
        <div className={cn('mt-0.5 mb-1 min-w-0 flex-1', contentClassName)}>
          <div className="flex flex-col">
            <AddressSuggestField
              address={address}
              onChange={onChange}
              poolAddresses={poolAddresses}
              defaultTown={siteSettings?.defaultTown ?? ''}
              manualOpen={showManualInput}
              onManualInput={() => setShowManualInput((value) => !value)}
              error={errors?.address}
            />

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
