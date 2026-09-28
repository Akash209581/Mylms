import type { Metadata, Viewport } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import './globals.css'
import './portal.css'
import './role-foundation.css'
import './theme-classic.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import ToastContainer from '@/components/ToastContainer'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const display = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Applied STEM Labs LMS | Professional Learning Platform',
  description: 'Learning Management System — Build skills. Grow careers.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5f0' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${display.variable}`}>
      <head>
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} crossOrigin="anonymous" />
        )}
      </head>
      <body className={`${inter.className} bg-mesh antialiased`}>
        <ThemeProvider attribute="data-theme" defaultTheme="light">
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  )
}
