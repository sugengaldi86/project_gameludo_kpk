import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'
import { getAdminAuth } from '@/lib/firebase-admin'
import { supabaseServer } from '@/lib/supabase'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 403 })
    }

    const { idToken } = await request.json()
    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'ID token diperlukan' }, { status: 400 })
    }

    const auth = getAdminAuth()
    const decoded = await auth.verifyIdToken(idToken, true)
    const supabase = supabaseServer()
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, firebase_uid, email, name, role')
      .eq('firebase_uid', decoded.uid)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Akun Firebase ini belum terdaftar sebagai admin Ludo KPK' },
        { status: 403 }
      )
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    })

    await supabase
      .from('admins')
      .update({
        email: decoded.email || admin.email,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', admin.id)

    const response = NextResponse.json({
      success: true,
      admin: { name: admin.name, email: decoded.email || admin.email, role: admin.role },
    })
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      priority: 'high',
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login admin gagal'
    const configurationError = message.includes('Firebase Admin belum dikonfigurasi')
    return NextResponse.json(
      { error: configurationError ? message : 'Sesi Firebase tidak valid atau kedaluwarsa' },
      { status: configurationError ? 503 : 401 }
    )
  }
}
