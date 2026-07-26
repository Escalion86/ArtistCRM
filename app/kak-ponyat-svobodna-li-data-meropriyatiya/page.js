import SeoGuidePage from '@components/SeoGuidePage'
import {
  buildSeoGuideMetadata,
  seoGuidePages,
} from '@helpers/seoGuidePages'

const page = seoGuidePages['kak-ponyat-svobodna-li-data-meropriyatiya']

export const metadata = buildSeoGuideMetadata(page)

export default function SeoArticlePage() {
  return <SeoGuidePage page={page} />
}
