'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '@/lib/firebase-client'

import { Mail, Key } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createServerSession(idToken: string) {
    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Login admin gagal')
    await auth.signOut()
    router.replace('/admin')
    router.refresh()
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await setPersistence(auth, inMemoryPersistence)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await createServerSession(await credential.user.getIdToken())
    } catch {
      setError('Email atau password tidak sesuai, atau akun belum terdaftar sebagai admin.')
      setLoading(false)
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleEmailLogin}>
      <label htmlFor="admin-email">Email</label>
      <div className="input-with-icon">
        <Mail />
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <label htmlFor="admin-password">Password</label>
      <div className="input-with-icon">
        <Key />
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="admin-login-error" role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Memverifikasi...' : 'Masuk'}</button>

    </form>
  )
}
