// import DevSwitch from '@components/DevSwitch'
import Link from 'next/link'
import UserMenu from './UserMenu'

const CabinetHeader = ({ title = '', titleLink, icon }) => {
  return (
    <div
      className="relative z-20 flex h-16 w-full items-center justify-end gap-x-4 bg-black px-3 text-white"
      style={{ gridArea: 'header' }}
    >
      {title ? (
        <div className="flex flex-1 items-center">
          <Link href="/" shallow className="hidden tablet:block">
            <img
              className="h-14 rounded-full"
              src={icon || '/img/logo.png'}
              alt="logo"
            />
          </Link>
          <div className="tablet:border-l-1 flex min-h-[42px] flex-1 items-center leading-4 tablet:ml-3 tablet:border-gray-600 tablet:pl-3">
            {titleLink ? (
              <Link href={titleLink} shallow className="hover:text-gray-300">
                <h1>{title}</h1>
              </Link>
            ) : (
              <h1>{title}</h1>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute left-1/2 z-10 -translate-x-1/2">
          <Link href="/" shallow>
            <img className="h-12" src="/img/logo.png" alt="logo" />
          </Link>
        </div>
      )}

      <UserMenu />
    </div>
  )
}

export default CabinetHeader
