import Link from 'next/link'
import CompanyWorkspaceClient from './CompanyWorkspaceClient'

export const metadata = {
  title: 'PartyCRM - кабинет компании',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CompanyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#171512]">
      <header className="border-b border-black/10 bg-white">
        <div className="flex items-center justify-between max-w-6xl px-5 py-4 mx-auto">
          <Link href="/party" className="text-lg font-semibold cursor-pointer">
            PartyCRM
          </Link>
          <Link href="/performer" className="cursor-pointer ui-btn ui-btn-secondary">
            Кабинет исполнителя
          </Link>
        </div>
      </header>

      <CompanyWorkspaceClient />
    </main>
  )
}
