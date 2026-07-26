import SeoGuidePage from '@components/SeoGuidePage'
import {
  buildSeoGuideMetadata,
  seoGuidePages,
} from '@helpers/seoGuidePages'

const page = seoGuidePages['kak-artistu-ne-teryat-zayavki-iz-messendzherov']

export const metadata = buildSeoGuideMetadata(page)

export default function SeoArticlePage() {
  return <SeoGuidePage page={page} />
}
