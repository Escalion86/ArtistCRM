import SeoLandingPage from '@components/SeoLandingPage'
import {
  buildSeoLandingMetadata,
  seoLandingPages,
} from '@helpers/seoLandingPages'

const page = seoLandingPages['crm-dlya-dekoratorov']

export const metadata = buildSeoLandingMetadata(page)

export default function CrmForDecoratorsPage() {
  return <SeoLandingPage page={page} />
}
