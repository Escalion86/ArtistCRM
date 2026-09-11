'use client'

import cn from 'classnames'
import { useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import addModalSelector from '@state/selectors/addModalSelector'
import addressEditorFunc from '@layouts/modals/modalsFunc/addressEditorFunc'
import InputWrapper from './InputWrapper'
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

  outerClassName,
  contentClassName,
  saveButtonLabel = 'Сохранить в пул',
  savedLabel = '✓ В пуле',
}) => {
  const siteSettings = useAtomValue(siteSettingsAtom)
  const addModal = useSetAtom(addModalSelector)

  const poolAddresses = useMemo(
    () =>
      Array.isArray(controlledPoolAddresses)
        ? controlledPoolAddresses
        : (siteSettings?.addresses ?? []),
    [controlledPoolAddresses, siteSettings?.addresses]
  )

  const openAddressEditor = () =>
    addModal(
      addressEditorFunc({
        address,
        onChange,
        townOptions,
        onCreateTown,
        allowTownCreate,
        poolAddresses: controlledPoolAddresses,
        onSaveAddress,
        saveButtonLabel,
        savedLabel,
      })
    )

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
      >
        <div className={cn('mt-0.5 mb-1 min-w-0 flex-1', contentClassName)}>
          <div className="flex flex-col">
            <AddressSuggestField
              address={address}
              onChange={onChange}
              poolAddresses={poolAddresses}
              defaultTown={siteSettings?.defaultTown ?? ''}
              onManualInput={openAddressEditor}
              error={errors?.address}
            />
          </div>
        </div>
      </InputWrapper>
    </div>
  )
}

export default AddressPoolPicker
