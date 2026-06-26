'use client'

import Button from '@components/Button'
import Input from '@components/Input'
import LoadingSpinner from '@components/LoadingSpinner'
import MutedText from '@components/MutedText'
import useSnackbar from '@helpers/useSnackbar'
import { useEffect, useState } from 'react'

const DEFAULT_PERCENT = 5

const SiteReferralSettingsContent = () => {
  const snackbar = useSnackbar()
  const [percent, setPercent] = useState(DEFAULT_PERCENT)
  const [initialPercent, setInitialPercent] = useState(DEFAULT_PERCENT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      setIsLoading(true)
      setErrorText('')
      try {
        const response = await fetch('/api/site/referral', {
          cache: 'no-store',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result?.success === false) {
          throw new Error(result?.error || 'Не удалось загрузить настройки')
        }
        const nextPercent = Number(result?.data?.percent ?? DEFAULT_PERCENT)
        if (cancelled) return
        setPercent(nextPercent)
        setInitialPercent(nextPercent)
      } catch (error) {
        if (cancelled) return
        setErrorText(error?.message || 'Не удалось загрузить настройки')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const saveSettings = async () => {
    setIsSaving(true)
    setErrorText('')
    try {
      const response = await fetch('/api/site/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ percent }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'Не удалось сохранить настройки')
      }
      const nextPercent = Number(result?.data?.percent ?? percent)
      setPercent(nextPercent)
      setInitialPercent(nextPercent)
      snackbar.success('Настройки реферальной системы сохранены')
    } catch (error) {
      const message = error?.message || 'Не удалось сохранить настройки'
      setErrorText(message)
      snackbar.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = Number(percent) !== Number(initialPercent)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner text="Загрузка настроек..." />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="flex max-w-xl flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Реферальный процент
            </div>
            <MutedText as="p" className="mt-1 text-gray-500">
              Этот процент начисляется пригласившему пользователю от каждого
              успешного пополнения баланса приглашенного пользователя.
            </MutedText>
          </div>
          <Input
            label="Процент начисления"
            type="number"
            min={0}
            max={100}
            step={1}
            value={percent}
            onChange={setPercent}
            postfix="%"
            noMargin
            fullWidth
            className="max-w-80"
          />
          {errorText ? (
            <div className="text-danger text-sm">{errorText}</div>
          ) : null}
          <div className="flex justify-end">
            <Button
              name="Сохранить"
              onClick={saveSettings}
              disabled={!hasChanges || isSaving}
              loading={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SiteReferralSettingsContent
