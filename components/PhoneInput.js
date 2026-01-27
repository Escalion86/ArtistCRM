import cn from 'classnames'
import MaskedInput from 'react-text-mask'
import InputWrapper from './InputWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy'
import { faPaste } from '@fortawesome/free-solid-svg-icons/faPaste'
import copyToClipboard from '@helpers/copyToClipboard'

const PhoneInput = ({
  value,
  label,
  onChange,
  required = false,
  disabled,
  labelClassName,
  className,
  noMargin,
  error,
  showErrorText,
  copyPasteButtons = false,
}) => (
  <InputWrapper
    label={label}
    labelClassName={labelClassName}
    value={value}
    required={required}
    className={cn('w-48', className)}
    disabled={disabled}
    noMargin={noMargin}
    error={error}
    showErrorText={showErrorText}
    wrapperClassName={
      disabled ? 'text-disabled cursor-not-allowed' : 'text-white'
    }
  >
    <div className="flex w-full items-center gap-2">
      <div className="text-gray-500">+7</div>
      <MaskedInput
        disabled={disabled}
        placeholder={' '}
        className={cn(
          'peer w-full bg-transparent px-1 placeholder-transparent focus:outline-hidden',
          required && (!value || value.toString().length !== 11)
            ? 'border-red-700'
            : 'border-gray-400',
          disabled ? 'text-disabled cursor-not-allowed' : 'text-input'
        )}
        guide={false}
        // showMask={false}
        // onFocus={(e) => {
        //   setShowMask(true)
        // }}
        // onBlur={() => setShowMask(false)}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9]/g, '')
          onChange(!value ? null : Number('7' + value))
          // onChange(Number('7' + value))
        }}
        // keepCharPositions
        mask={[
          // '+',
          // '7',
          // ' ',
          '(',
          /[1-9]/,
          /\d/,
          /\d/,
          ')',
          ' ',
          /\d/,
          /\d/,
          /\d/,
          '-',
          /\d/,
          /\d/,
          /\d/,
          /\d/,
        ]}
        value={
          value
            ? value.toString().substr(0, 1) == '7'
              ? value.toString().substring(1)
              : value.toString()
            : ''
        }
      />
      {copyPasteButtons && !disabled && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              if (!navigator?.clipboard) return
              navigator.clipboard.readText().then((text) => {
                const digits = String(text || '').replace(/[^\d]/g, '')
                if (!digits) {
                  onChange(null)
                  return
                }
                let normalized = digits
                if (normalized.startsWith('7') || normalized.startsWith('8'))
                  normalized = normalized.slice(1)
                if (normalized.length > 10)
                  normalized = normalized.slice(-10)
                onChange(Number('7' + normalized))
              })
            }}
            title="Вставить номер"
          >
            <FontAwesomeIcon icon={faPaste} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              if (!value) return
              const raw = String(value).replace(/[^\d]/g, '')
              const digits = raw.startsWith('7') ? raw.slice(1, 11) : raw
              if (!digits) return
              const formatted =
                digits.length >= 10
                  ? `+7(${digits.slice(0, 3)}) ${digits.slice(
                      3,
                      6
                    )}-${digits.slice(6, 10)}`
                  : `+7${digits}`
              copyToClipboard(formatted)
            }}
            title="Скопировать номер"
          >
            <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  </InputWrapper>
)

export default PhoneInput
