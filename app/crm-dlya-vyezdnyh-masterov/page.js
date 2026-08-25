import SeoLandingPage from '@components/SeoLandingPage'
import {
  buildSeoLandingMetadata,
  seoLandingPages,
} from '@helpers/seoLandingPages'

const page = seoLandingPages['crm-dlya-vyezdnyh-masterov']

export const metadata = buildSeoLandingMetadata(page)

export default function CrmForFieldSpecialistsPage() {
  return <SeoLandingPage page={page} />
}
