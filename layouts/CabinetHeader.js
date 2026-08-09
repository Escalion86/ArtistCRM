'use client'

/* eslint-disable @next/next/no-img-element */
// import DevSwitch from '@components/DevSwitch'
import Link from 'next/link'
import UserMenu from './UserMenu'

const CabinetHeader = ({ title = '', titleLink, icon, count = null }) => {
  return (
    <div
      className="cabinet-header relative z-20 flex h-16 w-full items-center justify-end gap-x-4 px-3"
      style={{ gridArea: 'header' }}
    >
      <div className="flex min-w-0 flex-1 items-center">
        <Link
          href="/"
          shallow
          className="tablet:flex hidden shrink-0 items-center gap-2"
        >
          <img
            className="h-10 rounded-full"
            src={icon || '/img/logo-48.png'}
            alt="Логотип ArtistCRM"
          />
          <span className="text-xl font-semibold tracking-tight">
            Artist<span className="text-[var(--ui-primary)]">CRM</span>
          </span>
        </Link>
        {title ? (
          <div className="tablet:ml-4 tablet:border-l tablet:border-gray-200 tablet:pl-4 tablet:text-sm tablet:font-normal tablet:text-gray-600 flex min-w-0 items-center gap-2 text-base font-semibold text-gray-800">
            {titleLink ? (
              <Link
                href={titleLink}
                shallow
                className="truncate hover:text-gray-900"
              >
                {title}
              </Link>
            ) : (
              <span className="truncate">{title}</span>
            )}
            {Number.isFinite(count) ? (
              <span className="shrink-0 text-xs font-semibold text-[#315da8]">
                {count}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <UserMenu />
    </div>
  )
}

export default CabinetHeader
