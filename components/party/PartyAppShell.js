'use client'

import {
  faBriefcase,
  faCalendarCheck,
  faChartLine,
  faGear,
  faHome,
  faLocationDot,
  faRightFromBracket,
  faUserGroup,
  faUserTie,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cn from 'classnames'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const companyMenu = [
  { href: '/company', label: 'Обзор', icon: faHome },
  { href: '/company/orders', label: 'Заказы', icon: faCalendarCheck },
  { href: '/company/finance', label: 'Финансы', icon: faChartLine },
  { href: '/company/locations', label: 'Точки', icon: faLocationDot },
  { href: '/company/staff', label: 'Сотрудники', icon: faUserGroup },
]

const performerMenu = [
  { href: '/performer', label: 'Мои заказы', icon: faBriefcase },
]

const secondaryMenu = [
  { href: '/company', label: 'Кабинет компании', icon: faBriefcase },
  { href: '/performer', label: 'Кабинет исполнителя', icon: faUserTie },
  { href: '/party/settings', label: 'Настройки', icon: faGear, always: true },
]

const getTitle = (variant) => {
  if (variant === 'performer') return 'Кабинет исполнителя'
  if (variant === 'settings') return 'Настройки'
  return 'Кабинет компании'
}

const MenuLink = ({ item, active, onClick }) => (
  <Link
    href={item.href}
    onClick={onClick}
    className={cn(
      'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      active
        ? 'bg-sky-500 text-white'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    )}
  >
    <FontAwesomeIcon icon={item.icon} className="h-4 w-4 min-w-4" />
    <span className="whitespace-nowrap">{item.label}</span>
  </Link>
)

export default function PartyAppShell({ variant = 'company', children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentHash, setCurrentHash] = useState('')
  const [interfaceRoles, setInterfaceRoles] = useState([])
  const [profileLoaded, setProfileLoaded] = useState(false)
  const title = getTitle(variant)
  const canUseCompany = interfaceRoles.includes('company')
  const canUsePerformer = interfaceRoles.includes('performer')
  const canUseBoth = canUseCompany && canUsePerformer
  const primaryMenu =
    variant === 'performer'
      ? performerMenu
      : variant === 'settings'
        ? canUseCompany
          ? companyMenu
          : canUsePerformer
            ? performerMenu
            : []
        : companyMenu
  const visibleSecondaryMenu = secondaryMenu.filter((item) => {
    if (item.always) return true
    if (!profileLoaded || !canUseBoth) return false
    if (item.href === '/company') return canUseCompany
    if (item.href === '/performer') return canUsePerformer
    return true
  })
  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash || '')
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    const loadProfile = () => {
      fetch('/api/party/auth/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const roles = payload?.data?.user?.interfaceRoles
        if (Array.isArray(roles) && roles.length > 0) setInterfaceRoles(roles)
        else setInterfaceRoles(['company', 'performer'])
        setProfileLoaded(true)
      })
      .catch(() => {
        setInterfaceRoles(['company', 'performer'])
        setProfileLoaded(true)
      })
    }

    loadProfile()
    window.addEventListener('partycrm:profile-updated', loadProfile)
    return () => {
      window.removeEventListener('partycrm:profile-updated', loadProfile)
    }
  }, [])

  useEffect(() => {
    if (!profileLoaded) return
    if (variant === 'settings') return
    if (variant === 'performer' && canUseCompany && !canUsePerformer) {
      router.replace('/company')
      return
    }
    if (variant !== 'performer' && canUsePerformer && !canUseCompany) {
      router.replace('/performer')
    }
  }, [canUseCompany, canUsePerformer, profileLoaded, router, variant])

  const isActive = (href) => {
    const [path, hash] = href.split('#')
    if (pathname !== path) return false
    if (hash) return currentHash === `#${hash}`
    return !currentHash
  }

  const logout = async () => {
    await fetch('/api/party/auth/logout', { method: 'POST' }).catch(() => null)
    router.replace('/party/login?callbackUrl=/company')
  }

  return (
    <main className="grid h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#eaf6ff] text-slate-950 md:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-0 flex-col bg-slate-950 text-white md:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Link href="/party" className="text-lg font-semibold text-sky-200">
            PartyCRM
          </Link>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <div className="grid gap-1">
            {primaryMenu.map((item) => (
              <MenuLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
              />
            ))}
          </div>

          <div className="mt-auto grid gap-1 border-t border-white/10 pt-4">
            {visibleSecondaryMenu.map((item) => (
              <MenuLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
              />
            ))}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <FontAwesomeIcon
                icon={faRightFromBracket}
                className="h-4 w-4 min-w-4"
              />
              <span>Выйти</span>
            </button>
          </div>
        </nav>
      </aside>

      <section className="grid min-h-0 grid-rows-[auto_1fr]">
        <div>
          <header className="relative z-20 flex h-16 items-center justify-between gap-3 border-b border-sky-100 bg-white px-4 md:bg-slate-950 md:text-white">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-md border border-sky-100 text-sky-700 md:hidden"
                aria-label="Открыть меню"
              >
                <span className="grid gap-1">
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 md:text-sky-300">
                  PartyCRM
                </p>
                <h1 className="truncate text-base font-semibold">{title}</h1>
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="border-b border-sky-100 bg-slate-950 px-3 py-3 md:hidden">
              <nav className="grid gap-1">
                {[...primaryMenu, ...visibleSecondaryMenu].map((item) => (
                  <MenuLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onClick={() => {
                      setCurrentHash(
                        item.href.includes('#')
                          ? `#${item.href.split('#')[1]}`
                          : ''
                      )
                      setMobileMenuOpen(false)
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={logout}
                  className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/80"
                >
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="h-4 w-4 min-w-4"
                  />
                  <span>Выйти</span>
                </button>
              </nav>
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto">{children}</div>
      </section>
    </main>
  )
}
