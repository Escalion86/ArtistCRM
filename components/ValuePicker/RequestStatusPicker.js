import { useMemo } from 'react'
import { REQUEST_STATUSES } from '@helpers/constants'
import ValuePicker from './ValuePicker'

const RequestStatusPicker = ({
  status,
  onChange,
  required = false,
  disableConvert = false,
  error = false,
}) => {
  const statuses = useMemo(
    () => [
      ...REQUEST_STATUSES,
      { value: 'convert', name: 'Преобразовать', color: 'green' },
    ],
    []
  )

  return (
    <ValuePicker
      value={status}
      valuesArray={statuses}
      label="Статус"
      onChange={onChange}
      name="request-status"
      required={required}
      error={error}
      disabledValues={disableConvert ? ['convert'] : []}
    />
  )
}

export default RequestStatusPicker
