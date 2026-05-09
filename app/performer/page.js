import Link from 'next/link'
import PerformerWorkspaceClient from './PerformerWorkspaceClient'

export const metadata = {
  title: 'PartyCRM - кабинет исполнителя',
  applicationName: 'PartyCRM',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PartyCRM',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function PerformerPage() {
  return (
    <main className="min-h-screen bg-[#eaf6ff] text-slate-950">
      <header className="bg-white border-b border-sky-100">
        <div className="flex items-center justify-between max-w-5xl px-5 py-4 mx-auto">
          <Link href="/party" className="text-lg font-semibold text-sky-700 cursor-pointer">
            PartyCRM
          </Link>
          <Link
            href="/company"
            className="px-4 py-2 text-sm font-semibold transition-colors bg-white border rounded-md cursor-pointer text-sky-700 border-sky-200 hover:bg-sky-50"
          >
            Кабинет компании
          </Link>
        </div>
      </header>

      <PerformerWorkspaceClient />
    </main>
  )
}
