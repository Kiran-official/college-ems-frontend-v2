import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const font = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'SICM EMS — Event Management System',
  description: 'Seshadripuram Institute of Commerce and Management — Event Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('sicm_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e) {}
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
