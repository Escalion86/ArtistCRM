'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import HeaderActions from '@components/HeaderActions'
import InputWrapper from '@components/InputWrapper'
import Input from '@components/Input'
import IconCheckBox from '@components/IconCheckBox'
import ComboBox from '@components/ComboBox'
import MutedText from '@components/MutedText'
import SectionCard from '@components/SectionCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { modalsFuncAtom } from '@state/atoms'
import { postData } from '@helpers/CRUD'

const normalizeTowns = (towns = []) =>
  Array.from(
    new Set(
      towns
        .map((town) => (typeof town === 'string' ? town.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'))

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
  const modalsFunc = useAtomValue(modalsFuncAtom)
  const [darkTheme, setDarkTheme] = useState(false)
  const [defaultEventDuration, setDefaultEventDuration] = useState(60)
  const durationTimeoutRef = useRef(null)

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    const isDark = storedTheme === 'dark'
    setDarkTheme(isDark)
    document.body.classList.toggle('theme-dark', isDark)
  }, [])

  const townsOptions = useMemo(
    () => normalizeTowns(siteSettings?.towns ?? []),
    [siteSettings?.towns]
  )
  const customSettings = siteSettings?.custom ?? {}
  const checkBoxColors = darkTheme
    ? { checked: '#f8fafc', unchecked: '#94a3b8' }
    : { checked: '#111827', unchecked: '#9ca3af' }

  useEffect(() => {
    const value = Number(customSettings?.defaultEventDurationMinutes ?? 60)
    setDefaultEventDuration(
      Number.isFinite(value) && value > 0 ? value : 60
    )
  }, [customSettings?.defaultEventDurationMinutes])

  useEffect(() => {
    if (!siteSettings?._id) return
    if (!Number.isFinite(defaultEventDuration)) return
    if (defaultEventDuration <= 0) return
    if (durationTimeoutRef.current) {
      clearTimeout(durationTimeoutRef.current)
    }
    durationTimeoutRef.current = setTimeout(() => {
      postData(
        '/api/site',
        {
          custom: {
            ...(siteSettings?.custom ?? {}),
            defaultEventDurationMinutes: defaultEventDuration,
          },
        },
        (data) => setSiteSettings(data),
        null,
        false,
        null
      )
    }, 400)
    return () => {
      if (durationTimeoutRef.current) {
        clearTimeout(durationTimeoutRef.current)
      }
    }
  }, [defaultEventDuration, setSiteSettings, siteSettings])

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <HeaderActions left={<div />} right={<div />} />
      </ContentHeader>

      <SectionCard className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
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
        <ComboBox
          label="Часовой пояс"
          items={TIME_ZONE_OPTIONS}
          value={siteSettings?.timeZone ?? 'Asia/Krasnoyarsk'}
          onChange={(value) =>
            postData(
              '/api/site',
              { timeZone: value },
              (data) => setSiteSettings(data),
              null,
              false,
              null
            )
          }
          fullWidth
        />
        <InputWrapper
          label="Стандартная длительность мероприятия, мин"
          fullWidth
        >
          <Input
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
        </InputWrapper>
        <InputWrapper label="Города" fullWidth>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <MutedText>
                Основной:{' '}
                <span className="font-semibold text-gray-900">
                  {siteSettings?.defaultTown || 'Не выбран'}
                </span>
              </MutedText>
              <MutedText className="text-gray-500">
                Городов создано: {townsOptions.length}
              </MutedText>
            </div>
            <button
              type="button"
              className="action-icon-button flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-orange-600 bg-orange-50 text-orange-500 shadow-sm transition hover:bg-orange-100 hover:text-orange-600"
              onClick={() => modalsFunc.settings?.towns()}
              title="Редактировать города"
            >
              <FontAwesomeIcon className="h-5 w-5" icon={faPencilAlt} />
            </button>
          </div>
        </InputWrapper>
      </SectionCard>
    </div>
  )
}

export default SettingsContent
