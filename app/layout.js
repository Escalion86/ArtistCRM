import './globals.css'
import './burger.css'
import '../fonts/InterTight.css'
import '../fonts/FuturaPT.css'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import ClientErrorLogger from '@components/ClientErrorLogger'
import AppSnackbarProvider from '@components/AppSnackbarProvider'
import AppQueryProvider from '@components/AppQueryProvider'
import Head from 'next/head'
// import { Suspense } from 'react'
// import Metrika from './components/metrika'
// import Script from 'next/script'

export const metadata = {
  title: 'ArtistCRM — CRM для артистов',
  description:
    'CRM-система для артистов: заявки, мероприятия, финансы, договоры и напоминания.',
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
}

export const viewport = {
  themeColor: '#ebd3a5',
}

export default function RootLayout({ children }) {
  const isProduction = process.env.NODE_ENV !== 'development'
  return (
    <html lang="ru" className="scroll-smooth" data-scroll-behavior="smooth">
      <Head>
        {/* Preload critical fonts for LCP optimization */}
        {/* FuturaPT-Heavy: used by h1 headings (LCP element) */}
        <link
          rel="preload"
          href="/fonts/FuturaPT-Heavy.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* FuturaPT-Bold: used by h1 with font-semibold (600) */}
        <link
          rel="preload"
          href="/fonts/FuturaPT-Bold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* InterTight: body text and UI elements */}
        <link
          rel="preload"
          href="/fonts/InterTight-Regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/InterTight-SemiBold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </Head>
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
