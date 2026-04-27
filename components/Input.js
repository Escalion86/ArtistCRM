import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown'
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp'
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy'
import { faPaste } from '@fortawesome/free-solid-svg-icons/faPaste'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cn from 'classnames'
import { forwardRef } from 'react'
import { MaskedInput } from '@thaborach/react-text-mask'
import { normalizeNumberInputString, toNormalizedNumber } from '@helpers/numberInput'
import copyToClipboard from '@helpers/copyToClipboard'
import InputWrapper from './InputWrapper'

const Input = forwardRef(
  (
    {
      label,
      onChange,
      value,
      className,
      type = 'text',
      inputClassName,
      labelClassName,
      error = false,
      prefix,
      postfix,
      noBorder = false,
      disabled = false,
      showDisabledIcon = true,
      min,
      max,
      required,
      step = 1,
      defaultValue,
      floatingLabel = true,
      showErrorText = false,
      fullWidth = false,
      paddingY = 'small',
      paddingX = true,
      noMargin = false,
      smallMargin = false,
      showArrows = true,
      autoComplete,
      maxLength,
      dataList,
      copyPasteButtons = false,
      normalizePastedValue,
    },
    ref
  ) => {
    const isPhone = type === 'phone'
    const prefixValue = isPhone && prefix === undefined ? '+7' : prefix
    const phoneMask = [
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
      '-',
      /\d/,
      /\d/,
    ]
    const phoneDisplayValue = (() => {
      if (!isPhone) return value
      if (value === null || value === undefined) return ''
      const digits = String(value).replace(/[^\d]/g, '')
      if (!digits || digits === '7') return ''
      return digits[0] === '7' ? digits.slice(1, 11) : digits.slice(0, 10)
    })()
    const placeholderValue = floatingLabel ? ' ' : label

    return (
      <InputWrapper
        label={label}
        labelClassName={labelClassName}
        value={value ?? defaultValue}
        className={className}
        required={required}
        floatingLabel={floatingLabel}
        error={error}
        showErrorText={showErrorText}
        paddingY={paddingY}
        paddingX={paddingX}
        postfix={postfix}
        prefix={prefixValue}
        ref={ref}
        disabled={disabled}
        fullWidth={fullWidth}
        noBorder={noBorder}
        noMargin={noMargin}
        smallMargin={smallMargin}
        showDisabledIcon={showDisabledIcon}
        comment={
          maxLength ? `${String(value)?.length} / ${maxLength}` : undefined
        }
        commentClassName={
          maxLength && String(value)?.length >= maxLength
            ? 'text-danger'
            : undefined
        }
      >
        {showArrows && type === 'number' && !disabled && (
          <div
            className={cn(
              'px-1 duration-300',
              typeof min === 'number' && value <= min
                ? 'text-disabled cursor-not-allowed'
                : 'text-general hover:text-success cursor-pointer'
            )}
            onClick={() => {
              if (typeof min !== 'number')
                onChange(Number(value) - Number(step))
              else onChange(Math.max(Number(value) - Number(step), min))
            }}
          >
            <FontAwesomeIcon icon={faArrowDown} className="h-4 min-h-4 w-4" />
          </div>
        )}

        {isPhone ? (
          <MaskedInput
            type="tel"
            className={cn(
              'peer h-7 flex-1 bg-transparent px-1 text-black placeholder-transparent focus:outline-none',
              disabled ? 'text-disabled cursor-not-allowed' : '',
              inputClassName
            )}
            guide={false}
            mask={phoneMask}
            value={phoneDisplayValue}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '')
              if (!raw) {
                onChange(null)
                return
              }
              if (raw.length === 1 && (raw === '7' || raw === '8')) {
                onChange(null)
                return
              }
              let digits = raw
              if (
                digits.length === 11 &&
                (digits.startsWith('7') || digits.startsWith('8'))
              ) {
                digits = digits.slice(1)
              }
              if (digits.length > 10) digits = digits.slice(-10)
              onChange(Number('7' + digits))
            }}
            placeholder={placeholderValue}
            autoComplete={autoComplete}
            disabled={disabled}
          />
        ) : (
          <input
            type={type}
            step={step}
            className={cn(
              'peer h-7 flex-1 bg-transparent px-1 text-black placeholder-transparent focus:outline-none',
              type === 'number' ? 'hide-number-spin' : '',
              disabled ? 'text-disabled cursor-not-allowed' : '',
              inputClassName
            )}
            onWheel={(e) => e.target.blur()}
            min={min}
            max={max}
            disabled={disabled}
            value={
              value === null
                ? ''
                : typeof value === 'number'
                  ? String(value)
                  : value
            }
            defaultValue={defaultValue}
            onChange={(e) => {
              const { value } = e.target
              if (type === 'number') {
                if (value === '') {
                  onChange(0)
                  return
                }

                onChange(toNormalizedNumber(value, { fallback: 0, min, max }))
              } else {
                if (maxLength && value?.length > maxLength)
                  onChange(value.substring(0, maxLength))
                else onChange(value)
              }
            }}
            onBlur={(e) => {
              if (type !== 'number') return
              const normalized = normalizeNumberInputString(e.target.value)
              if (!normalized || normalized === e.target.value) return
              onChange(toNormalizedNumber(normalized, { fallback: 0, min, max }))
            }}
            placeholder={placeholderValue}
            autoComplete={autoComplete}
            list={dataList?.name}
          />
        )}
        {dataList?.list && (
          <datalist id={dataList?.name}>
            {dataList.list.map((item) => (
              <option key={'list' + item}>{item}</option>
            ))}
          </datalist>
        )}
        {copyPasteButtons && !disabled && type !== 'number' && !isPhone && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:bg-gray-50"
              onClick={() => {
                if (!navigator?.clipboard) return
                navigator.clipboard.readText().then((text) => {
                  const normalized =
                    typeof normalizePastedValue === 'function'
                      ? normalizePastedValue(text)
                      : String(text ?? '')
                  onChange(normalized)
                })
              }}
              title="Вставить"
            >
              <FontAwesomeIcon icon={faPaste} className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:bg-gray-50"
              onClick={() => {
                copyToClipboard(String(value ?? ''))
              }}
              title="Скопировать"
            >
              <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {showArrows && type === 'number' && !disabled && (
          <div
            className={cn(
              'px-1 duration-300',
              typeof max === 'number' && value >= max
                ? 'text-disabled cursor-not-allowed'
                : 'text-general hover:text-success cursor-pointer'
            )}
            onClick={() => {
              if (typeof max !== 'number')
                onChange(Number(value) + Number(step))
              else onChange(Math.min(Number(value) + Number(step), max))
            }}
          >
            <FontAwesomeIcon icon={faArrowUp} className="h-4 min-h-4 w-4" />
          </div>
        )}
      </InputWrapper>
    )
  }
)

Input.displayName = 'Input'

export default Input
