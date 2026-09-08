'use client'

import cn from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes'
import { formatAddressPoolShort } from '@helpers/addressPool'

const MIN_QUERY_LENGTH = 4
const DEBOUNCE_MS = 600
const MAX_POOL_ITEMS = 5
const CLIENT_CACHE_MAX = 50

const hasConcreteAddress = (address) =>
  Boolean(
    address?.street ||
      address?.house ||
      address?.flat ||
      address?.room ||
      address?.comment
  )

const AddressSuggestField = ({
  address,
  onChange,
  poolAddresses = [],
  defaultTown = '',
  manualOpen = false,
  onManualInput,
  error,
  placeholder = 'Начните вводить адрес или выберите из своих',
}) => {
  const [mode, setMode] = useState(() =>
    hasConcreteAddress(address) ? 'view' : 'search'
  )
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestFailed, setSuggestFailed] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const unavailableRef = useRef(false)

  const formattedAddress = useMemo(
    () => formatAddressPoolShort(address),
    [address]
  )

  // Синхронизация режима с внешним address (AI-черновик, загрузка события)
  useEffect(() => {
    setMode(hasConcreteAddress(address) ? 'view' : 'search')
  }, [address])

  const poolMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery
      ? poolAddresses.filter((addr) =>
          formatAddressPoolShort(addr).toLowerCase().includes(normalizedQuery)
        )
      : poolAddresses
    return filtered.slice(0, MAX_POOL_ITEMS)
  }, [poolAddresses, query])

  // Строки подсказок видны только при этих условиях —
  // клавиатурный список обязан совпадать с рендером
  const showSuggestRows =
    query.trim().length >= MIN_QUERY_LENGTH && !loading && !suggestFailed

  // Плоский список опций дропдауна: единый источник для рендера и навигации
  const options = useMemo(() => {
    const list = poolMatches.map((addr) => ({ type: 'pool', payload: addr }))
    if (showSuggestRows) {
      suggestions.forEach((suggestion) => {
        list.push({ type: 'suggest', payload: suggestion })
      })
    }
    list.push({ type: 'manual' })
    return list
  }, [poolMatches, showSuggestRows, suggestions])

  // Сброс выделения при любом изменении списка опций,
  // чтобы activeIndex не мог указывать за границы списка
  useEffect(() => {
    setActiveIndex(-1)
  }, [options])

  const setClientCache = (key, value) => {
    if (cacheRef.current.size >= CLIENT_CACHE_MAX) cacheRef.current.clear()
    cacheRef.current.set(key, value)
  }

  // Best effort: при стирании символов используем кэш более длинного запроса
  const findPrefixCache = (normalizedQuery) => {
    let best = null
    for (const [key, value] of cacheRef.current.entries()) {
      if (
        key.startsWith(normalizedQuery) &&
        (!best || key.length > best.key.length)
      ) {
        best = { key, value }
      }
    }
    if (!best) return null
    const filtered = best.value.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(normalizedQuery)
    )
    return filtered.length > 0 ? filtered : null
  }

  const fetchSuggestions = async (value) => {
    const normalizedQuery = value.trim().toLowerCase()
    if (unavailableRef.current) return

    const exact = cacheRef.current.get(normalizedQuery)
    if (exact) {
      setSuggestions(exact)
      return
    }
    const prefixFiltered = findPrefixCache(normalizedQuery)
    if (prefixFiltered) {
      setSuggestions(prefixFiltered)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setSuggestFailed(false)
    try {
      const res = await fetch('/api/address/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value.trim(), town: defaultTown }),
        signal: controller.signal,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setSuggestFailed(true)
        setSuggestions([])
        return
      }
      const data = json.data ?? {}
      if (data.unavailable) {
        unavailableRef.current = true
        setSuggestions([])
        return
      }
      const next = data.suggestions ?? []
      setSuggestions(next)
      setClientCache(normalizedQuery, next)
    } catch (fetchError) {
      if (fetchError?.name !== 'AbortError') {
        setSuggestFailed(true)
        setSuggestions([])
      }
    } finally {
      // Отменённый запрос не трогает loading: им владеет более новый запрос
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return undefined
    }
    debounceRef.current = setTimeout(
      () => fetchSuggestions(normalizedQuery),
      DEBOUNCE_MS
    )
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleSelectPool = (addr) => {
    onChange?.({ ...addr })
    setIsOpen(false)
    setQuery('')
  }

  const handleSelectSuggestion = async (suggestion) => {
    setIsOpen(false)
    setQuery('')
    // Уточняющий запрос ради координат; при ошибке — адрес из подсказки
    try {
      const res = await fetch('/api/address/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'select', query: suggestion.label }),
      })
      const json = await res.json().catch(() => null)
      const selected = json?.success ? json?.data?.selected : null
      onChange?.({ ...address, ...(selected?.address ?? suggestion.address) })
    } catch {
      onChange?.({ ...address, ...suggestion.address })
    }
  }

  const handleSelectOption = (option) => {
    if (option.type === 'pool') handleSelectPool(option.payload)
    else if (option.type === 'suggest') handleSelectSuggestion(option.payload)
    else {
      setIsOpen(false)
      onManualInput?.()
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (!isOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      // Блокируем неявный submit формы всегда, пока открыт дропдаун
      event.preventDefault()
      if (activeIndex >= 0 && options[activeIndex]) {
        handleSelectOption(options[activeIndex])
      }
    }
  }

  const optionClassName = (index) =>
    cn(
      'flex min-h-[48px] w-full cursor-pointer items-center px-3 text-left text-sm hover:bg-blue-50',
      index === activeIndex && 'bg-blue-50'
    )

  if (mode === 'view') {
    return (
      <div className="mt-2.5 flex flex-col gap-y-1">
        <div className="flex min-h-[48px] items-center gap-x-2 rounded border border-gray-300 bg-white px-3">
          <span className="min-w-0 flex-1 truncate text-sm">
            {formattedAddress}
          </span>
          <button
            type="button"
            title="Изменить адрес"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center p-2 text-gray-500 hover:text-general"
            onClick={() => {
              setQuery('')
              setMode('search')
            }}
          >
            <FontAwesomeIcon icon={faPencilAlt} className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Очистить адрес"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center p-2 text-gray-500 hover:text-red-500"
            onClick={() => onChange?.(null)}
          >
            <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
          </button>
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
        <button
          type="button"
          className="cursor-pointer self-start text-sm text-general hover:underline"
          onClick={() => onManualInput?.()}
        >
          {manualOpen ? 'Свернуть детали адреса' : 'Дополнить адрес'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative mt-2.5">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        className={cn(
          'h-[48px] w-full rounded border bg-white px-3 text-sm outline-none',
          error ? 'border-red-400' : 'border-gray-300 focus:border-general'
        )}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(-1)
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
          {poolMatches.length > 0 && (
            <div className="px-3 pt-2 text-xs font-semibold text-gray-400">
              Мои адреса
            </div>
          )}
          {/* Строки рендерятся ровно из options: сначала пул, затем подсказки и «Ввести вручную» */}
          {options.slice(0, poolMatches.length).map((option, index) => (
            <button
              key={`pool-${index}-${formatAddressPoolShort(option.payload)}`}
              type="button"
              className={optionClassName(index)}
              onMouseDown={(event) => {
                event.preventDefault()
                handleSelectOption(option)
              }}
            >
              {formatAddressPoolShort(option.payload)}
            </button>
          ))}
          {query.trim().length >= MIN_QUERY_LENGTH && (
            <>
              {loading && (
                <div className="px-3 py-3 text-sm text-gray-400">Поиск…</div>
              )}
              {!loading && suggestFailed && (
                <div className="px-3 py-3 text-sm text-gray-500">
                  Подсказки временно недоступны
                </div>
              )}
              {!loading &&
                !suggestFailed &&
                suggestions.length === 0 &&
                !unavailableRef.current && (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    Ничего не найдено
                  </div>
                )}
            </>
          )}
          {query.trim().length < MIN_QUERY_LENGTH &&
            poolMatches.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">
                Введите улицу и дом, например: Ленинградская 12
              </div>
            )}
          {options.slice(poolMatches.length).map((option, offset) => {
            const index = poolMatches.length + offset
            if (option.type === 'manual') {
              return (
                <button
                  key="manual"
                  type="button"
                  className={cn(
                    optionClassName(index),
                    'border-t border-gray-100 text-general'
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelectOption(option)
                  }}
                >
                  Ввести вручную
                </button>
              )
            }
            return (
              <button
                key={`suggest-${option.payload.label}`}
                type="button"
                className={optionClassName(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectOption(option)
                }}
              >
                {option.payload.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AddressSuggestField
