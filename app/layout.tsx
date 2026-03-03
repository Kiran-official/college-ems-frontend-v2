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
<<<<<<< HEAD
    <html lang="en" className={font.variable}>
=======
    <html lang="en" className={font.variable} suppressHydrationWarning>
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
<<<<<<< HEAD
              var t = localStorage.getItem('sicm_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', t);
=======
              var theme = localStorage.getItem('sicm_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', theme);
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
            } catch(e) {}
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
