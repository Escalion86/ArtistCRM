import './globals.css'
import './burger.css'
import '../fonts/InterTight.css'
import '../fonts/FuturaPT.css'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import ClientErrorLogger from '@components/ClientErrorLogger'
import AppSnackbarProvider from '@components/AppSnackbarProvider'
import AppQueryProvider from '@components/AppQueryProvider'
// import { Suspense } from 'react'
// import Metrika from './components/metrika'
// import Script from 'next/script'
// import Head from 'next/head'

const rawDomain = process.env.DOMAIN || 'https://artistcrm.ru'
const siteUrl = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`
const normalizedSiteUrl = siteUrl.replace(/\/$/, '')
const defaultOgImage = `${normalizedSiteUrl}/og-image.jpg`

export const metadata = {
  title: 'ArtistCRM — CRM для артистов',
  description:
    'CRM-система для артистов: заявки, мероприятия, финансы, договоры и напоминания.',
  keywords: [
    'CRM для артистов',
    'CRM для ведущих',
    'CRM для музыкантов',
    'учет заявок',
    'управление мероприятиями',
    'ArtistCRM',
  ],
  applicationName: 'ArtistCRM',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ArtistCRM',
  },
  icons: {
    icon: [
      {
        url: '/icons/AppImages/android/android-launchericon-192-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/AppImages/android/android-launchericon-512-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      { url: '/icons/AppImages/ios/180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: normalizedSiteUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: normalizedSiteUrl,
    siteName: 'ArtistCRM',
    title: 'ArtistCRM — CRM для артистов, ведущих и музыкантов',
    description:
      'Управляйте заявками, клиентами, финансами и документами в одном кабинете. Синхронизация с Google Календарем.',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'ArtistCRM — CRM для артистов',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArtistCRM — CRM для артистов',
    description:
      'Управляйте заявками, клиентами, финансами и документами в одном кабинете.',
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "google-site-verification": "U2T-pi-_H9TW4SgMktbTv-cf6FNQPbx2DwRCs8WOZWk",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: '#ebd3a5',
}

export default function RootLayout({ children }) {
  const isProduction = process.env.NODE_ENV !== 'development'
  return (
    <html lang="ru" className="scroll-smooth" data-scroll-behavior="smooth">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ClientErrorLogger enabled={isProduction} />
          {/* {isProduction && (
            <>
              <Script id="yandex-metrika" strategy="afterInteractive">
                {`
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(38403125, "init", {
          defer: true,
          clickmap:true,
          trackLinks:true,
          accurateTrackBounce:true
        });    
      `}
              </Script>
              <Suspense fallback={<></>}>
                <Metrika />
              </Suspense>
            </>
          )} */}
          <AppQueryProvider>
            <AppSnackbarProvider>{children}</AppSnackbarProvider>
          </AppQueryProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
