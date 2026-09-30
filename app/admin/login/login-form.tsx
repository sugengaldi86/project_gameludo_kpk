'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  type AuthError,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '@/lib/firebase-client'

import { Mail, Key } from 'lucide-react'

function getLoginErrorMessage(error: unknown) {
  const code = (error as Partial<AuthError>)?.code

  if (!code && error instanceof Error && error.message) {
    return error.message
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email atau password salah. Pastikan akun sudah dibuat di Firebase Authentication.'
    case 'auth/user-disabled':
      return 'Akun ini dinonaktifkan. Aktifkan kembali akun melalui Firebase Console.'
    case 'auth/operation-not-allowed':
      return 'Login Email/Password belum diaktifkan pada Firebase Authentication.'
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba kembali.'
    case 'auth/network-request-failed':
      return 'Firebase tidak dapat dihubungi. Periksa koneksi internet lalu coba kembali.'
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
    case 'auth/unauthorized-domain':
      return 'Konfigurasi Firebase untuk domain ini belum benar. Periksa Environment Variables dan Authorized domains.'
    default:
      return 'Login gagal. Silakan coba kembali atau hubungi administrator aplikasi.'
  }
}

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
      const normalizedEmail = email.trim().toLowerCase()
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
      await createServerSession(await credential.user.getIdToken())
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError))
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
          autoCapitalize="none"
          spellCheck={false}
          disabled={loading}
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
          disabled={loading}
          required
        />
      </div>
      {error && <p className="admin-login-error" role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Memverifikasi...' : 'Masuk'}</button>

    </form>
  )
}
