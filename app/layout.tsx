import { Space_Grotesk, Outfit } from 'next/font/google'
import './globals.css'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration'

const fontBody = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const fontHeading = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SICM EMS — Event Management System',
  description: 'Seshadripuram Institute of Commerce and Management — Event Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SICM EMS',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontBody.variable} ${fontHeading.variable}`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SICM EMS" />
        <link rel="apple-touch-icon" href="/assets/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('sicm_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e) {}
          `
        }} />
      </head>
      <body>
        <ServiceWorkerRegistration />
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
