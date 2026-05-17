'use client'

import { useState, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMicrophoneSlash, faSpinner, faCircleCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { postData } from '@helpers/CRUD'

/**
 * VoiceDraftButton — кнопка голосового ввода для быстрого создания события.
 *
 * Использует Web Speech API для распознавания речи в браузере,
 * затем отправляет текст на серверный API для ИИ-автозаполнения.
 *
 * Пропсы:
 *   onDraft(fields)  — вызывается при получении полей от сервера.
 *   disabled         — блокирует кнопку.
 *   className        — дополнительные классы для обёртки.
 */
const VoiceDraftButton = ({ onDraft, disabled, className }) => {
  const [status, setStatus] = useState('idle') // idle | listening | processing | success | error | unsupported
  const [errorMessage, setErrorMessage] = useState('')
  const recognitionRef = useRef(null)

  // Проверка поддержки Web Speech API
  const speechSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  const getRecognition = useCallback(() => {
    if (!speechSupported) return null
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.lang = 'ru-RU'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false
    return rec
  }, [speechSupported])

  const handleStart = useCallback(() => {
    if (disabled || status !== 'idle') return

    const recognition = getRecognition()
    if (!recognition) {
      setStatus('unsupported')
      setErrorMessage('Web Speech API не поддерживается в этом браузере')
      return
    }

    recognitionRef.current = recognition
    setStatus('listening')
    setErrorMessage('')

    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      recognitionRef.current = null

      if (!transcript) {
        setStatus('error')
        setErrorMessage('Не удалось распознать речь')
        return
      }

      setStatus('processing')

      try {
        const response = await postData('/api/events/ai-draft', { text: transcript })
        if (response?.error) {
          setStatus('error')
          setErrorMessage(response.error)
        } else {
          const fields = response?.fields ?? {}
          setStatus('success')
          // Сбрасываем статус через 2 секунды
          setTimeout(() => setStatus('idle'), 2000)
          if (onDraft) {
            onDraft(fields, transcript)
          }
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage('Ошибка при отправке запроса')
        console.error('[VoiceDraftButton] fetch error:', err)
      }
    }

    recognition.onerror = (event) => {
      recognitionRef.current = null
      setStatus('error')

      switch (event.error) {
        case 'not-allowed':
          setErrorMessage('Доступ к микрофону запрещён')
          break
        case 'no-speech':
          setErrorMessage('Речь не обнаружена')
          break
        case 'audio-capture':
          setErrorMessage('Микрофон недоступен')
          break
        case 'network':
          setErrorMessage('Сетевая ошибка распознавания')
          break
        default:
          setErrorMessage(`Ошибка распознавания: ${event.error}`)
      }
    }

    recognition.onend = () => {
      recognitionRef.current = null
      // Если слушали и не получили результат (не перешли в processing/success/error)
      if (status === 'listening') {
        setStatus('idle')
      }
    }

    try {
      recognition.start()
    } catch (err) {
      setStatus('error')
      setErrorMessage('Не удалось запустить распознавание')
      console.error('[VoiceDraftButton] start error:', err)
    }
  }, [disabled, status, getRecognition, onDraft])

  const handleStop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setStatus('idle')
  }, [])

  // Не поддерживается — показываем кнопку-заглушку
  if (!speechSupported) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
        <button
          type="button"
          disabled
          className="inline-flex items-center px-3 py-2 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed"
          title="Web Speech API не поддерживается этим браузером"
        >
          <FontAwesomeIcon icon={faMicrophoneSlash} className="w-4 h-4 mr-1.5" />
          Голосовой ввод
        </button>
      </div>
    )
  }

  // Кнопка с разными состояниями
  const buttonConfig = {
    idle: {
      icon: faMicrophone,
      label: 'Голосовой ввод',
      className: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 active:bg-blue-200',
      onClick: handleStart,
    },
    listening: {
      icon: faMicrophone,
      label: 'Говорите...',
      className: 'text-red-700 bg-red-50 border-red-300 animate-pulse',
      onClick: handleStop,
    },
    processing: {
      icon: faSpinner,
      label: 'Обработка...',
      className: 'text-amber-700 bg-amber-50 border-amber-200',
      onClick: null,
    },
    success: {
      icon: faCircleCheck,
      label: 'Готово!',
      className: 'text-green-700 bg-green-50 border-green-200',
      onClick: null,
    },
    error: {
      icon: faExclamationTriangle,
      label: 'Ошибка',
      className: 'text-red-700 bg-red-50 border-red-200',
      onClick: () => {
        setStatus('idle')
        setErrorMessage('')
      },
    },
  }

  const config = buttonConfig[status] || buttonConfig.idle
  const isInteractive = status === 'idle' || status === 'listening' || status === 'error'

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled || !isInteractive}
        onClick={config.onClick}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isInteractive ? 'cursor-pointer' : 'cursor-default'} ${config.className}`}
        title={errorMessage || config.label}
      >
        <FontAwesomeIcon
          icon={config.icon}
          className={`w-4 h-4 mr-1.5 ${status === 'processing' ? 'animate-spin' : ''}`}
        />
        {config.label}
      </button>
      {status === 'error' && errorMessage && (
        <span className="text-xs text-red-600 max-w-[200px] truncate">{errorMessage}</span>
      )}
    </div>
  )
}

VoiceDraftButton.propTypes = {
  onDraft: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
}

export default VoiceDraftButton
