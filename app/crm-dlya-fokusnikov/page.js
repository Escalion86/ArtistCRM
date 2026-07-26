import SeoLandingPage from '@components/SeoLandingPage'
import {
  buildSeoLandingMetadata,
  seoLandingPages,
} from '@helpers/seoLandingPages'

const page = seoLandingPages['crm-dlya-fokusnikov']

export const metadata = buildSeoLandingMetadata(page)

export default function CrmForMagiciansPage() {
  return <SeoLandingPage page={page} />
}
