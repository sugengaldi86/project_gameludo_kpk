import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLogin = path === '/admin/login'
  const isSessionEndpoint = path === '/api/admin/session'
  const hasSession = request.cookies.has(ADMIN_SESSION_COOKIE)

  if (!hasSession && !isLogin && !isSessionEndpoint) {
    if (path.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
