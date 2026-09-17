import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './portal.css'
import './role-foundation.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import ToastContainer from '@/components/ToastContainer'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Applied Stem labs LMS | Professional Learning Platform',
  description: 'Premium Learning Management System — Build skills. Grow careers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} />
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
