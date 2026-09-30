import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'
import { getAdminAuth } from '@/lib/firebase-admin'
import { supabaseServer } from '@/lib/supabase'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5
const ADMIN_ROLES = new Set(['admin', 'super_admin'])
const FIREBASE_UID_PLACEHOLDERS = new Set([
  'MASUKKAN_UID_FIREBASE_DI_SINI',
  'GANTI_DENGAN_FIREBASE_UID',
])

type AdminRecord = {
  id: string
  firebase_uid: string
  email: string
  name: string
  role: string
}

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
    const { data: uidAdmin, error: uidLookupError } = await supabase
      .from('admins')
      .select('id, firebase_uid, email, name, role')
      .eq('firebase_uid', decoded.uid)
      .maybeSingle<AdminRecord>()

    if (uidLookupError) {
      return NextResponse.json(
        { error: 'Data admin tidak dapat diperiksa. Silakan coba kembali.' },
        { status: 503 }
      )
    }

    let admin = uidAdmin

    // Admin boleh dipra-daftarkan berdasarkan email. Pada login pertama, UID
    // placeholder diganti dengan UID yang sudah diverifikasi oleh Firebase.
    if (!admin && decoded.email) {
      const normalizedEmail = decoded.email.trim().toLowerCase()
      const { data: emailAdmin, error: emailLookupError } = await supabase
        .from('admins')
        .select('id, firebase_uid, email, name, role')
        .eq('email', normalizedEmail)
        .maybeSingle<AdminRecord>()

      if (emailLookupError) {
        return NextResponse.json(
          { error: 'Data admin tidak dapat diperiksa. Silakan coba kembali.' },
          { status: 503 }
        )
      }

      if (
        emailAdmin &&
        ADMIN_ROLES.has(emailAdmin.role) &&
        FIREBASE_UID_PLACEHOLDERS.has(emailAdmin.firebase_uid)
      ) {
        const { data: linkedAdmin, error: linkError } = await supabase
          .from('admins')
          .update({ firebase_uid: decoded.uid, email: normalizedEmail })
          .eq('id', emailAdmin.id)
          .eq('firebase_uid', emailAdmin.firebase_uid)
          .select('id, firebase_uid, email, name, role')
          .single<AdminRecord>()

        if (linkError || !linkedAdmin) {
          return NextResponse.json(
            { error: 'UID Firebase gagal dihubungkan ke akun admin.' },
            { status: 409 }
          )
        }

        admin = linkedAdmin
      }
    }

    if (!admin || !ADMIN_ROLES.has(admin.role)) {
      return NextResponse.json(
        { error: 'Akun Firebase ini belum terdaftar sebagai admin Ludo KPK. Pastikan email dan UID Firebase pada tabel admins sudah benar.' },
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
