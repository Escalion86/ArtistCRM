/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import HeaderActions from '@components/HeaderActions'
import Input from '@components/Input'
import IconCheckBox from '@components/IconCheckBox'
import ComboBox from '@components/ComboBox'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import LabeledContainer from '@components/LabeledContainer'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { postData } from '@helpers/CRUD'
import {
  resolveServerSyncDisabled,
  writeServerSyncDisabledToStorage,
} from '@helpers/serverSyncMode'
import {
  clearServerSyncQueue,
  getServerSyncQueueCount,
  SERVER_SYNC_FLUSH_NOW_EVENT,
  SERVER_SYNC_QUEUE_CHANGED_EVENT,
} from '@helpers/serverSyncQueue'

const TIME_ZONE_OPTIONS = [
  { value: 'UTC', name: 'UTC' },
  { value: 'Europe/Kaliningrad', name: 'UTC+02 Калининград' },
  { value: 'Europe/Moscow', name: 'UTC+03 Москва' },
  { value: 'Europe/Samara', name: 'UTC+04 Самара' },
  { value: 'Asia/Yekaterinburg', name: 'UTC+05 Екатеринбург' },
  { value: 'Asia/Omsk', name: 'UTC+06 Омск' },
  { value: 'Asia/Krasnoyarsk', name: 'UTC+07 Красноярск' },
  { value: 'Asia/Irkutsk', name: 'UTC+08 Иркутск' },
  { value: 'Asia/Yakutsk', name: 'UTC+09 Якутск' },
  { value: 'Asia/Vladivostok', name: 'UTC+10 Владивосток' },
  { value: 'Asia/Magadan', name: 'UTC+11 Магадан' },
  { value: 'Asia/Kamchatka', name: 'UTC+12 Камчатка' },
]

const SettingsContent = () => {
  const [siteSettings, setSiteSettings] = useAtom(siteSettingsAtom)
  const [darkTheme, setDarkTheme] = useState(false)
  const [defaultEventDuration, setDefaultEventDuration] = useState(60)
  const [queuedChangesCount, setQueuedChangesCount] = useState(0)
  const durationTimeoutRef = useRef(null)

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    const isDark = storedTheme === 'dark'
    setDarkTheme(isDark)
    document.body.classList.toggle('theme-dark', isDark)
  }, [])

  const customSettings = siteSettings?.custom ?? {}
  const serverSyncDisabled = resolveServerSyncDisabled(siteSettings)
  const checkBoxColors = darkTheme
    ? { checked: '#f8fafc', unchecked: '#94a3b8' }
    : { checked: '#111827', unchecked: '#9ca3af' }

  const mergeSiteSettingsPatch = (currentSettings, patch) => {
    const current = currentSettings ?? {}
    const next = { ...current, ...patch }
    if (patch?.custom !== undefined) {
      next.custom = {
        ...(current?.custom ?? {}),
        ...(patch.custom ?? {}),
      }
    }
    return next
  }

  const saveSiteSettingsPatch = async (patch, forceServerSync = false) => {
    const merged = mergeSiteSettingsPatch(siteSettings, patch)
    setSiteSettings(merged)

    if (serverSyncDisabled && !forceServerSync) return merged

    await postData(
      '/api/site',
      patch,
      (data) => setSiteSettings(data),
      null,
      false,
      null
    )
    return merged
  }

  useEffect(() => {
    setQueuedChangesCount(getServerSyncQueueCount())
    if (typeof window === 'undefined') return undefined
    const handleQueueChanged = () => {
      setQueuedChangesCount(getServerSyncQueueCount())
    }
    window.addEventListener(SERVER_SYNC_QUEUE_CHANGED_EVENT, handleQueueChanged)
    return () => {
      window.removeEventListener(
        SERVER_SYNC_QUEUE_CHANGED_EVENT,
        handleQueueChanged
      )
    }
  }, [])

  useEffect(() => {
    const value = Number(customSettings?.defaultEventDurationMinutes ?? 60)
    setDefaultEventDuration(Number.isFinite(value) && value > 0 ? value : 60)
  }, [customSettings?.defaultEventDurationMinutes])

  useEffect(() => {
    if (!siteSettings?._id) return
    if (!Number.isFinite(defaultEventDuration)) return
    if (defaultEventDuration <= 0) return
    const currentDuration = Number(
      siteSettings?.custom?.defaultEventDurationMinutes ?? 60
    )
    if (currentDuration === defaultEventDuration) return
    if (durationTimeoutRef.current) {
      clearTimeout(durationTimeoutRef.current)
    }
    durationTimeoutRef.current = setTimeout(() => {
      saveSiteSettingsPatch({
        custom: {
          defaultEventDurationMinutes: defaultEventDuration,
        },
      })
    }, 400)
    return () => {
      if (durationTimeoutRef.current) {
        clearTimeout(durationTimeoutRef.current)
      }
    }
  }, [defaultEventDuration, siteSettings, serverSyncDisabled])

  return (
    <div className="flex flex-col h-full gap-4">
      <ContentHeader>
        <HeaderActions left={<div />} right={<div />} />
      </ContentHeader>

      <SectionCard className="flex flex-col flex-1 min-h-0 gap-4 p-4 overflow-y-auto">
        <IconCheckBox
          label="Темная тема"
          checked={darkTheme}
          onClick={() => {
            const nextValue = !darkTheme
            setDarkTheme(nextValue)
            localStorage.setItem('theme', nextValue ? 'dark' : 'light')
            document.body.classList.toggle('theme-dark', nextValue)
          }}
          checkedIconColor={checkBoxColors.checked}
          uncheckedIconColor={checkBoxColors.unchecked}
          noMargin
        />
        <LabeledContainer label="Конфиденциальность" noMargin>
          <div className="flex flex-col w-full gap-3">
            <IconCheckBox
              label="Отключить синхронизацию с сервером"
              checked={serverSyncDisabled}
              onClick={async () => {
                const nextValue = !serverSyncDisabled
                writeServerSyncDisabledToStorage(nextValue)
                const patch = {
                  custom: {
                    ...(siteSettings?.custom ?? {}),
                    disableServerSync: nextValue,
                  },
                }
                if (nextValue) {
                  setSiteSettings(mergeSiteSettingsPatch(siteSettings, patch))
                  return
                }
                await saveSiteSettingsPatch(patch, true)
              }}
              checkedIconColor={checkBoxColors.checked}
              uncheckedIconColor={checkBoxColors.unchecked}
              noMargin
            />
            <MutedText className="text-gray-500">
              {serverSyncDisabled
                ? 'Серверная синхронизация отключена: изменения сохраняются только локально на этом устройстве.'
                : 'Серверная синхронизация включена: изменения сохраняются в облаке и доступны на других устройствах.'}
            </MutedText>
            {serverSyncDisabled ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MutedText className="text-gray-500">
                  Локальная очередь запросов: {queuedChangesCount}
                </MutedText>
                <button
                  type="button"
                  className="flex items-center justify-center px-3 text-xs font-semibold rounded cursor-pointer action-icon-button action-icon-button--warning h-9"
                  onClick={() => {
                    clearServerSyncQueue()
                  }}
                >
                  Очистить очередь
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MutedText className="text-gray-500">
                  В очереди к синхронизации: {queuedChangesCount}
                </MutedText>
                <button
                  type="button"
                  className="flex items-center justify-center px-3 text-xs font-semibold rounded cursor-pointer action-icon-button action-icon-button--warning h-9"
                  onClick={() => {
                    if (typeof window === 'undefined') return
                    window.dispatchEvent(
                      new CustomEvent(SERVER_SYNC_FLUSH_NOW_EVENT)
                    )
                  }}
                  disabled={queuedChangesCount === 0}
                >
                  Синхронизировать сейчас
                </button>
              </div>
            )}
          </div>
        </LabeledContainer>
        <ComboBox
          label="Часовой пояс"
          items={TIME_ZONE_OPTIONS}
          value={siteSettings?.timeZone ?? 'Asia/Krasnoyarsk'}
          onChange={(value) => saveSiteSettingsPatch({ timeZone: value })}
          fullWidth
          noMargin
        />
        <Input
          label="Стандартная длительность мероприятия, мин"
          type="number"
          min={15}
          max={1440}
          step={15}
          value={defaultEventDuration}
          onChange={setDefaultEventDuration}
          noMargin
          fullWidth
          showArrows
        />
        <LabeledContainer label="Мастер запуска" noMargin>
          <div className="flex items-center justify-between w-full gap-3">
            <MutedText className="text-gray-500">
              Сбросьте прогресс, чтобы снова пройти шаги первичной настройки.
            </MutedText>
            <button
              type="button"
              className="flex items-center justify-center h-10 px-3 text-sm font-semibold rounded cursor-pointer action-icon-button action-icon-button--warning"
              onClick={() =>
                saveSiteSettingsPatch({
                  custom: {
                    ...(siteSettings?.custom ?? {}),
                    releaseOnboardingCompleted: false,
                    releaseOnboardingShowToken: Date.now(),
                  },
                })
              }
            >
              Запустить заново
            </button>
          </div>
        </LabeledContainer>
      </SectionCard>
    </div>
  )
}

export default SettingsContent
