import './globals.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { LanguageProvider } from './components/LanguageProvider'
import SessionProvider from './components/SessionProvider'

const siteUrl = 'https://www.utkorea.org'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'UT Austin Korea Alumni Association | 텍사스 대학교 오스틴 한국 동문회',
    template: '%s | UT Austin Korea Alumni',
  },
  description: 'Official alumni network connecting University of Texas at Austin Longhorns living in Korea. Join events, network with fellow alumni, and stay connected. 한국에 거주하는 UT Austin 동문들을 연결하는 공식 동문회입니다.',
  keywords: ['UT Austin', 'University of Texas', 'Korea alumni', 'Longhorns', '텍사스 대학교', '한국 동문회', 'UT Austin Korea', 'alumni network', 'Hook em'],
  authors: [{ name: 'UT Austin Korea Alumni Association' }],
  icons: {
    icon: '/favicon-tab.png',
    apple: '/favicon-tab.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: 'en_US',
    url: siteUrl,
    siteName: 'UT Austin Korea Alumni Association',
    title: 'UT Austin Korea Alumni Association | 텍사스 대학교 오스틴 한국 동문회',
    description: 'Connecting University of Texas at Austin Longhorns in Korea. Join events, network, and stay connected with fellow alumni.',
    images: [
      {
        url: '/grand reunion.jpg',
        width: 1200,
        height: 630,
        alt: 'UT Austin Korea Alumni Association',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UT Austin Korea Alumni Association',
    description: 'Connecting UT Austin Longhorns in Korea — 텍사스 대학교 오스틴 한국 동문회',
    images: ['/grand reunion.jpg'],
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <SessionProvider>
          <LanguageProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
