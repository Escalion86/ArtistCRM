import PartyAppShell from '@components/party/PartyAppShell'
import CompanyWorkspaceClient from './CompanyWorkspaceClient'

export default function CompanyPageShell({ section = 'overview' }) {
  return (
    <PartyAppShell variant="company">
      <CompanyWorkspaceClient section={section} />
    </PartyAppShell>
  )
}
