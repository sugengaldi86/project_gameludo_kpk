import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'
import { getAdminAuth } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 403 })
  }
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  if (sessionCookie) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(sessionCookie)
      await getAdminAuth().revokeRefreshTokens(decoded.uid)
    } catch {
      // Cookie tetap dihapus walaupun sesi sudah tidak valid.
    }
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
