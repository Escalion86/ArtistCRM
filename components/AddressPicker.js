'use client'

import FormWrapper from './FormWrapper'
import ImageCheckBox from './ImageCheckBox'
import Input from './Input'
import InputWrapper from './InputWrapper'
import Note from './Note'
import ComboBox from './ComboBox'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useMemo } from 'react'

const AddressPicker = ({
  address,
  onChange,
  label = 'Адрес',
  labelClassName,
  wrapperClassName,
  errors,
  required,
  townOptions = [],
  onCreateTown,
  allowTownCreate = true,
}) => {
  const townItems = useMemo(() => {
    const items = new Set()
    townOptions.forEach((town) => {
      if (typeof town === 'string' && town.trim()) items.add(town.trim())
    })
    if (address?.town && typeof address.town === 'string')
      items.add(address.town.trim())
    return Array.from(items).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [address?.town, townOptions])

  const handleCreateTown = () => {
    if (!allowTownCreate) return
    const newTown = window.prompt('Новый город')
    const trimmedTown = newTown?.trim()
    if (!trimmedTown) return
    onCreateTown?.(trimmedTown)
    onChange({ ...address, town: trimmedTown })
  }

  return (
    <InputWrapper
      label={label}
      labelClassName={labelClassName}
      value={address}
      className={wrapperClassName}
      required={required}
      paddingY={false}
      paddingX="small"
      centerLabel={true}
    >
      <div className="mt-0.5 mb-1 flex-1">
        <FormWrapper className="mt-3 mb-1 flex flex-wrap gap-x-2 gap-y-3">
          <div className="flex flex-1 items-center gap-x-1">
            <ComboBox
              label="Город"
              items={townItems}
              value={address.town}
              onChange={(town) => onChange({ ...address, town: town ?? '' })}
              placeholder="Выберите город"
              noMargin
              fullWidth
              error={errors?.address?.town}
              className="min-w-38 flex-1"
            />
            {allowTownCreate && (
              <button
                type="button"
                className="action-icon-button flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100"
                onClick={handleCreateTown}
                title="Добавить город"
              >
                <FontAwesomeIcon className="h-4 w-4" icon={faPlus} />
              </button>
            )}
          </div>
        </FormWrapper>
        <FormWrapper className="mt-1 mb-1 flex flex-wrap gap-x-2 gap-y-3">
          <Input
            label="Улица"
            type="text"
            value={address.street}
            onChange={(street) => onChange({ ...address, street })}
            error={errors?.address?.street}
            noMargin
            className="min-w-24 flex-1"
          />
          <Input
            label="Дом"
            type="text"
            value={address.house}
            onChange={(house) => onChange({ ...address, house })}
            error={errors?.address?.house}
            noMargin
            className="min-w-24 flex-1"
          />
        </FormWrapper>
        <FormWrapper className="mt-1 mb-1 flex flex-wrap gap-x-2 gap-y-3">
          <Input
            label="Подъезд"
            type="text"
            value={address.entrance}
            onChange={(entrance) => onChange({ ...address, entrance })}
            error={errors?.address?.entrance}
            noMargin
            className="min-w-12 flex-1"
          />
          <Input
            label="Этаж"
            type="text"
            value={address.floor}
            onChange={(floor) => onChange({ ...address, floor })}
            error={errors?.address?.floor}
            noMargin
            className="min-w-12 flex-1"
          />
          <Input
            label="Кв. / Офис"
            type="text"
            value={address.flat}
            onChange={(flat) => onChange({ ...address, flat })}
            error={errors?.address?.flat}
            noMargin
            className="min-w-12 flex-1"
          />
        </FormWrapper>
        <Input
          label="Уточнения по адресу"
          type="text"
          value={address.comment}
          onChange={(comment) => onChange({ ...address, comment })}
          noMargin
          error={errors?.address?.comment}
        />
        <FormWrapper className="mt-1 mb-1 flex flex-wrap gap-x-2 gap-y-3">
          <Input
            label="Широта"
            type="text"
            value={address.latitude}
            onChange={(latitude) => onChange({ ...address, latitude })}
            error={errors?.address?.latitude}
            noMargin
            className="min-w-24 flex-1"
          />
          <Input
            label="Долгота"
            type="text"
            value={address.longitude}
            onChange={(longitude) => onChange({ ...address, longitude })}
            error={errors?.address?.longitude}
            noMargin
            className="min-w-24 flex-1"
          />
        </FormWrapper>
        <div className="flex flex-wrap items-end justify-between gap-x-2">
          {/* <ImageCheckBox
            checked={address.link2GisShow}
            onClick={() =>
              onChange({ ...address, link2GisShow: !address.link2GisShow })
            }
            label="Показывать ссылку 2ГИС"
            src="/img/navigators/2gis.png"
            big
            alt="2gis"
          /> */}
          {address.link2GisShow &&
            (address.link2Gis || (address?.town && address?.street)) && (
              <div className="flex flex-1 justify-end">
                <a
                  data-tip="Открыть адрес в 2ГИС"
                  href={
                    address.link2Gis ||
                    `https://2gis.ru/search/${address.town},%20${
                      address.street
                    }%20${address.house.replaceAll('/', '%2F')}`
                  }
                  className="text-sm whitespace-nowrap underline"
                  target="_blank"
                >
                  Проверить ссылку
                </a>
              </div>
            )}
        </div>
        {/* {address.link2GisShow && ( */}
        <Input
          label="Ссылка 2ГИС"
          type="link"
          value={address.link2Gis}
          onChange={(link2Gis) => onChange({ ...address, link2Gis })}
          error={errors?.address?.link2Gis}
          noMargin
          className="mt-0.5"
        />
        {/* )} */}
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-2">
          {/* <ImageCheckBox
            checked={address.linkYandexShow}
            onClick={() =>
              onChange({ ...address, linkYandexShow: !address.linkYandexShow })
            }
            label="Показывать ссылку Yandex Navigator"
            src="/img/navigators/yandex.png"
            big
            alt="yandex_nav"
          /> */}
          {address.linkYandexShow &&
            (address.linkYandexNavigator ||
              (address?.town && address?.street)) && (
              <div className="flex flex-1 justify-end">
                <a
                  data-tip="Открыть адрес в 2ГИС"
                  href={
                    address.linkYandexNavigator ||
                    `yandexnavi://map_search?text=${address.town},%20${
                      address.street
                    }%20${address.house.replaceAll('/', '%2F')}`
                  }
                  className="text-sm whitespace-nowrap underline"
                  target="_blank"
                >
                  Проверить ссылку
                </a>
              </div>
            )}
        </div>
        {/* {address.linkYandexShow && ( */}
        <Input
          label="Ссылка Yandex Navigator"
          type="link"
          value={address.linkYandexNavigator}
          onChange={(linkYandexNavigator) =>
            onChange({ ...address, linkYandexNavigator })
          }
          error={errors?.address?.linkYandexNavigator}
          noMargin
          className="mt-0.5"
        />
        {/* )} */}
        {/* {(address.linkYandexShow || address.link2GisShow) && (
          <Note>
            Если ссылка не указана, то будет сгенерирована автоматически исходя
            из данных адреса
          </Note>
        )} */}
      </div>
    </InputWrapper>
  )
}

export default AddressPicker
