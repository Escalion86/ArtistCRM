import SeoLandingPage from '@components/SeoLandingPage'
import {
  buildSeoLandingMetadata,
  seoLandingPages,
} from '@helpers/seoLandingPages'

const page = seoLandingPages['crm-dlya-chastnyh-specialistov']

export const metadata = buildSeoLandingMetadata(page)

export default function CrmForPrivateSpecialistsPage() {
  return <SeoLandingPage page={page} />
}
