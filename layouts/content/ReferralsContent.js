'use client'

import Button from '@components/Button'
import LoadingSpinner from '@components/LoadingSpinner'
import MutedText from '@components/MutedText'
import useSnackbar from '@helpers/useSnackbar'
import loggedUserAtom from '@state/atoms/loggedUserAtom'
import { useAtomValue } from 'jotai'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

const DEFAULT_PERCENT = 5

const ReferralsContent = () => {
  const loggedUser = useAtomValue(loggedUserAtom)
  const snackbar = useSnackbar()
  const [origin, setOrigin] = useState('')
  const [percent, setPercent] = useState(DEFAULT_PERCENT)
  const [qrSrc, setQrSrc] = useState('')
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [qrErrorText, setQrErrorText] = useState('')

  const loggedUserId = loggedUser?._id ? String(loggedUser._id) : ''
  const qrServiceBaseUrl = (
    process.env.NEXT_PUBLIC_QR_SERVICE_URL || 'https://qr.escalion.ru'
  ).replace(/\/$/, '')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadReferralSettings = async () => {
      try {
        const response = await fetch('/api/site/referral', {
          cache: 'no-store',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result?.success === false) return
        const nextPercent = Number(result?.data?.percent ?? DEFAULT_PERCENT)
        if (!cancelled && Number.isFinite(nextPercent)) {
          setPercent(nextPercent)
        }
      } catch {
        if (!cancelled) setPercent(DEFAULT_PERCENT)
      }
    }

    loadReferralSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const referralPath = useMemo(() => {
    if (!loggedUserId) return ''
    return `/login?mode=register&ref=${encodeURIComponent(loggedUserId)}`
  }, [loggedUserId])

  const referralLink = useMemo(() => {
    if (!referralPath) return ''
    return origin ? `${origin}${referralPath}` : referralPath
  }, [origin, referralPath])

  useEffect(() => {
    if (!referralLink) return undefined

    const controller = new AbortController()
    let objectUrl = ''

    const fetchQr = async () => {
      setIsQrLoading(true)
      setQrSrc('')
      setQrErrorText('')

      try {
        const response = await fetch(`${qrServiceBaseUrl}/api/v1/qr/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'url',
            data: { url: referralLink },
            options: {
              width: 300,
              margin: 2,
              errorCorrectionLevel: 'H',
            },
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`QR service response error: ${response.status}`)
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        setQrSrc(objectUrl)
      } catch (error) {
        if (controller.signal.aborted) return
        setQrErrorText(error?.message || 'Не удалось загрузить QR-код')
      } finally {
        if (!controller.signal.aborted) setIsQrLoading(false)
      }
    }

    fetchQr()

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [qrServiceBaseUrl, referralLink])

  const copyLink = useCallback(async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      snackbar.success('Реферальная ссылка скопирована')
    } catch {
      snackbar.error('Не удалось скопировать ссылку')
    }
  }, [referralLink, snackbar])

  if (!loggedUserId) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner text="Загрузка профиля..." />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                Ваша реферальная ссылка
              </div>
              <MutedText as="p" className="mt-1 text-gray-500">
                Поделитесь ссылкой с новым пользователем. После регистрации по
                ней вы будете получать {percent}% от каждого его пополнения
                баланса.
              </MutedText>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm break-all text-gray-800">
              {referralLink}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                name="Скопировать ссылку"
                onClick={copyLink}
                disabled={!referralLink}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">QR-код</div>
            <div className="flex aspect-square w-full max-w-[300px] items-center justify-center self-center rounded-lg border border-gray-200 bg-gray-50 p-3">
              {isQrLoading ? (
                <LoadingSpinner size="sm" text="Загружаем QR..." />
              ) : qrSrc ? (
                <Image
                  src={qrSrc}
                  alt="QR-код реферальной ссылки"
                  width={300}
                  height={300}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="px-2 text-center text-sm text-gray-500">
                  {qrErrorText || 'QR-код пока недоступен'}
                </div>
              )}
            </div>
            <MutedText as="p" className="text-gray-500">
              Если QR-код не загрузился, используйте ссылку.
            </MutedText>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReferralsContent
