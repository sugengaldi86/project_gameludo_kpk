'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  Gamepad2,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react'
import { LogoutButton } from './logout-button'

const navigation = [
  { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/admin/questions', label: 'Bank Soal', icon: BookOpenCheck },
  { href: '/admin/exams', label: 'Pengaturan Ujian', icon: CalendarClock },
  { href: '/admin/reports', label: 'Rekap Nilai', icon: BarChart3 },
]

export function AdminShell({
  adminName,
  adminRole,
  children,
}: {
  adminName: string
  adminRole: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="admin-app-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon"><Gamepad2 /></div>
          <div><strong>LUDO KPK</strong><span>Panel Admin</span></div>
          <button className="admin-sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Tutup menu"><X /></button>
        </div>
        <nav aria-label="Navigasi admin">
          {navigation.map((item) => {
            const active = item.href === '/admin'
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                <Icon /><span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="admin-sidebar-profile">
          <div className="admin-avatar">{adminName.charAt(0).toUpperCase()}</div>
          <div><strong>{adminName}</strong><span>{adminRole.replace('_', ' ')}</span></div>
        </div>
        <LogoutButton />
      </aside>
      {menuOpen && <button className="admin-sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Tutup menu" />}
      <div className="admin-main-column">
        <header className="admin-mobile-header">
          <button onClick={() => setMenuOpen(true)} aria-label="Buka menu"><Menu /></button>
          <strong>LUDO KPK · Admin</strong>
          <div className="admin-avatar small">{adminName.charAt(0).toUpperCase()}</div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
