import SeoGuidePage from '@components/SeoGuidePage'
import {
  buildSeoGuideMetadata,
  seoGuidePages,
} from '@helpers/seoGuidePages'

const page = seoGuidePages['crm-ili-google-kalendar-dlya-artista']

export const metadata = buildSeoGuideMetadata(page)

export default function SeoArticlePage() {
  return <SeoGuidePage page={page} />
}
