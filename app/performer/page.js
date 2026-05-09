import Link from 'next/link'
import PerformerWorkspaceClient from './PerformerWorkspaceClient'

export const metadata = {
  title: 'PartyCRM - кабинет исполнителя',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PerformerPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#171512]">
      <header className="border-b border-black/10 bg-white">
        <div className="flex items-center justify-between max-w-5xl px-5 py-4 mx-auto">
          <Link href="/party" className="text-lg font-semibold cursor-pointer">
            PartyCRM
          </Link>
          <Link href="/company" className="cursor-pointer ui-btn ui-btn-secondary">
            Кабинет компании
          </Link>
        </div>
      </header>

      <PerformerWorkspaceClient />
    </main>
  )
}
