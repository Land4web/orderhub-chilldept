import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const roboto = Roboto({ variable: '--font-roboto', subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: 'Chill-Dept Order Hub',
  description: 'Centrale omgeving voor orderbeheer, voorraad en AFAS-verwerking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${roboto.variable} h-full antialiased`}>
      <body className="h-full bg-[#F8FAFC] text-[#111827]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
