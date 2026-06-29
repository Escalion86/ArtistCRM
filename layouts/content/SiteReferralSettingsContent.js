'use client'

import Button from '@components/Button'
import Input from '@components/Input'
import LoadingSpinner from '@components/LoadingSpinner'
import MutedText from '@components/MutedText'
import formatDate from '@helpers/formatDate'
import { formatMoney } from '@helpers/formatMoney'
import useSnackbar from '@helpers/useSnackbar'
import { useEffect, useState } from 'react'

const DEFAULT_PERCENT = 5

const getUserName = (user) => {
  const name = [user?.secondName, user?.firstName, user?.thirdName]
    .filter(Boolean)
    .join(' ')
    .trim()
  return name || 'Пользователь'
}

const SiteReferralSettingsContent = () => {
  const snackbar = useSnackbar()
  const [percent, setPercent] = useState(DEFAULT_PERCENT)
  const [initialPercent, setInitialPercent] = useState(DEFAULT_PERCENT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [reportData, setReportData] = useState(null)
  const [isReportLoading, setIsReportLoading] = useState(true)
  const [reportErrorText, setReportErrorText] = useState('')

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

  useEffect(() => {
    let cancelled = false

    const loadReport = async () => {
      setIsReportLoading(true)
      setReportErrorText('')
      try {
        const response = await fetch('/api/referrals?scope=admin', {
          cache: 'no-store',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result?.success === false) {
          throw new Error(result?.error || 'Не удалось загрузить рефералов')
        }
        if (!cancelled) setReportData(result?.data ?? null)
      } catch (error) {
        if (!cancelled) {
          setReportErrorText(error?.message || 'Не удалось загрузить рефералов')
        }
      } finally {
        if (!cancelled) setIsReportLoading(false)
      }
    }

    loadReport()

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

        <div className="flex max-w-5xl flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Рефереры и рефералы
            </div>
            <MutedText as="p" className="mt-1 text-gray-500">
              Общий developer-отчет по пользователям, которые пригласили новых
              пользователей по реферальной ссылке.
            </MutedText>
          </div>

          {isReportLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <LoadingSpinner size="sm" text="Загрузка отчета..." />
            </div>
          ) : reportErrorText ? (
            <div className="text-danger text-sm">{reportErrorText}</div>
          ) : reportData?.groups?.length > 0 ? (
            <div className="flex flex-col gap-4">
              {reportData.groups.map((group) => (
                <div
                  key={group.referrer._id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {getUserName(group.referrer)}
                      </div>
                      <MutedText className="text-gray-500">
                        Рефералов: {group.referralsCount}. Начислений:{' '}
                        {group.rewardsCount}.
                      </MutedText>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 sm:text-right">
                      {formatMoney(group.rewardsTotal ?? 0)}
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="py-2 pr-4 font-medium">Реферал</th>
                          <th className="py-2 pr-4 font-medium">
                            Регистрация
                          </th>
                          <th className="py-2 pr-4 font-medium">Начислений</th>
                          <th className="py-2 font-medium">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {group.referrals.map((row) => (
                          <tr key={row.user._id}>
                            <td className="py-2 pr-4 text-gray-900">
                              {getUserName(row.user)}
                            </td>
                            <td className="py-2 pr-4 text-gray-600">
                              {formatDate(row.user.createdAt) || '—'}
                            </td>
                            <td className="py-2 pr-4 text-gray-600">
                              {row.rewardsCount ?? 0}
                            </td>
                            <td className="py-2 text-gray-900">
                              {formatMoney(row.rewardsTotal ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Реферальных регистраций пока нет.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SiteReferralSettingsContent
