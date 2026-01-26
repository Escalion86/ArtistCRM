'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import ContentHeader from '@components/ContentHeader'
import InputWrapper from '@components/InputWrapper'
import IconCheckBox from '@components/IconCheckBox'
import ComboBox from '@components/ComboBox'
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
  const checkBoxColors = darkTheme
    ? { checked: '#f8fafc', unchecked: '#94a3b8' }
    : { checked: '#111827', unchecked: '#9ca3af' }

  return (
    <div className="flex h-full flex-col gap-4">
      <ContentHeader>
        <div className="flex flex-1 items-center justify-between">
          <div />
          <div />
        </div>
      </ContentHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
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
        <IconCheckBox
          label="Сохранять ответ Google Calendar в комментарии"
          checked={Boolean(siteSettings?.storeCalendarResponse)}
          onClick={() =>
            postData(
              '/api/site',
              { storeCalendarResponse: !siteSettings?.storeCalendarResponse },
              (data) => setSiteSettings(data),
              null,
              false,
              null
            )
          }
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
        <InputWrapper label="Города" fullWidth>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">
                Основной:{' '}
                <span className="font-semibold text-gray-900">
                  {siteSettings?.defaultTown || 'Не выбран'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Городов создано: {townsOptions.length}
              </div>
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
      </div>
    </div>
  )
}

export default SettingsContent
