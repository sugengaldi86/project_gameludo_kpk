'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return <button className="admin-logout" onClick={logout}>Keluar</button>
}
