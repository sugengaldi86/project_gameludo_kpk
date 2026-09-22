import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-session'
import { LoginForm } from './login-form'

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin')

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">🎲 LUDO KPK</div>
        <h1>Login Admin</h1>
        <p>Dashboard khusus guru dan operator sekolah.</p>
        <LoginForm />
      </section>
    </main>
  )
}
