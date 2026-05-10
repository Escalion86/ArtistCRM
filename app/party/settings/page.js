import PartyAppShell from '@components/party/PartyAppShell'
import PartySettingsClient from './PartySettingsClient'

export const metadata = {
  title: 'PartyCRM - настройки',
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

export default function PartySettingsPage() {
  return (
    <PartyAppShell variant="settings">
      <PartySettingsClient />
    </PartyAppShell>
  )
}
