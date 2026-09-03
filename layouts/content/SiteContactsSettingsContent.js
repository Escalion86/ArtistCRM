'use client'

import Button from '@components/Button'
import Input from '@components/Input'
import LoadingSpinner from '@components/LoadingSpinner'
import Notice from '@components/Notice'
import {
  getTelegramCommunityUrlError,
  normalizeTelegramCommunityUrl,
} from '@helpers/onboardingCommunity.mjs'
import useSnackbar from '@helpers/useSnackbar'
import { useEffect, useState } from 'react'

const SiteContactsSettingsContent = () => {
  const snackbar = useSnackbar()
  const [telegramCommunityUrl, setTelegramCommunityUrl] = useState('')
  const [savedTelegramCommunityUrl, setSavedTelegramCommunityUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/site/community', {
          cache: 'no-store',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result?.success === false) {
          throw new Error(
            result?.error?.message || 'Не удалось загрузить контакты сайта'
          )
        }
        if (cancelled) return
        const value = normalizeTelegramCommunityUrl(result?.data?.telegramUrl)
        setTelegramCommunityUrl(value)
        setSavedTelegramCommunityUrl(value)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Не удалось загрузить контакты сайта')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const validationError = getTelegramCommunityUrlError(telegramCommunityUrl)
  const hasChanges = telegramCommunityUrl !== savedTelegramCommunityUrl

  const save = async () => {
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const response = await fetch('/api/site/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUrl: telegramCommunityUrl }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error?.message || 'Не удалось сохранить контакты сайта'
        )
      }
      const value = normalizeTelegramCommunityUrl(result?.data?.telegramUrl)
      setTelegramCommunityUrl(value)
      setSavedTelegramCommunityUrl(value)
      snackbar.success('Контакты сайта сохранены')
    } catch (saveError) {
      const message = saveError?.message || 'Не удалось сохранить контакты сайта'
      setError(message)
      snackbar.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner text="Загрузка контактов..." />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Сообщество Telegram
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Ссылка показывается всем пользователям на последнем шаге мастера
            первого запуска. Оставьте поле пустым, чтобы скрыть приглашение.
            Можно указать ссылку https://t.me/… или tg://+код. Ссылка
            tg://+код будет сохранена в формате tg://join?invite=код для открытия
            приложения Telegram.
          </p>

          <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <Input
              label="Ссылка на группу Telegram"
              value={telegramCommunityUrl}
              onChange={(value) => {
                setTelegramCommunityUrl(value)
                setError('')
              }}
              placeholder="https://t.me/artistcrm_chat"
              error={validationError}
              fullWidth
              noMargin
            />
            <Button
              name="Сохранить"
              onClick={save}
              loading={isSaving}
              disabled={isSaving || !hasChanges || Boolean(validationError)}
              className="w-full sm:w-auto"
            />
          </div>

          {error ? (
            <Notice tone="error" role="alert" className="mt-4 rounded-md">
              {error}
            </Notice>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default SiteContactsSettingsContent
