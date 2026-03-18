import './globals.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { LanguageProvider } from './components/LanguageProvider'
import SessionProvider from './components/SessionProvider'

export const metadata = {
  title: 'UT Austin Korea Alumni Association',
  description: 'Connecting University of Texas at Austin Longhorns in Korea — 텍사스 대학교 오스틴 한국 동문회',
  icons: {
    icon: '/favicon.png',
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
