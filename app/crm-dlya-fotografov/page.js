import SeoLandingPage from '@components/SeoLandingPage'
import {
  buildSeoLandingMetadata,
  seoLandingPages,
} from '@helpers/seoLandingPages'

const page = seoLandingPages['crm-dlya-fotografov']

export const metadata = buildSeoLandingMetadata(page)

export default function CrmForPhotographersPage() {
  return <SeoLandingPage page={page} />
}
