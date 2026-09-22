import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-session'
import { AdminShell } from '../admin-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession()
  if (!admin) redirect('/admin/login')

  return <AdminShell adminName={admin.name} adminRole={admin.role}>{children}</AdminShell>
}
