import { Inter } from 'next/font/google'
import './admin.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-admin',
  weight: ['400', '500', '600', '700'],
})

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} admin-font-root`}>{children}</div>
}
