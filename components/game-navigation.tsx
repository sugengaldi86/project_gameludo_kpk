'use client'

import { BookOpen, Home, Star, Trophy } from 'lucide-react'
import type { NavItem } from '@/lib/game-data'
import { navItems } from '@/lib/game-data'

export function GameNavigation({ activeNav, onNavigate }: { activeNav: NavItem; onNavigate: (label: NavItem) => void }) {
  const icons = { Game: Home, Rank: Trophy, Misi: Star, Belajar: BookOpen, Profil: null }
  return <nav className="bottom-nav" aria-label="Navigasi utama">{navItems.map((item) => { const Icon = icons[item]; return <button key={item} className={activeNav === item ? 'nav-active' : ''} onClick={() => onNavigate(item)}>{Icon ? <Icon /> : <div className="nav-profile">A</div>}<span>{item}</span></button> })}</nav>
}
