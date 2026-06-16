import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/hooks/useAuth'

export const metadata: Metadata = {
  title: { default: 'thefamgroup Admin', template: '%s | TFG Admin' },
  description: 'thefamgroup back-office management system',
  robots: 'noindex, nofollow', // admin — never index
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
