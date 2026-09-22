import { NextResponse } from 'next/server'
import { GUEST_ROOM_COOKIE } from '@/lib/auth-constants'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ code: string }> }

export async function POST(request: Request, { params }: Context) {
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 403 })
  }
  const { code } = await params
  const guest = await getGuestRoomSession(code)
  if (!guest) {
    const expiredResponse = NextResponse.json({ status: 'EXPIRED' })
    expiredResponse.cookies.set(GUEST_ROOM_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return expiredResponse
  }

  const { data, error } = await supabaseServer().rpc('abandon_local_game', { p_room_id: guest.roomId })
  
  if (error) {
    console.error('Failed to abandon game in DB:', error)
  }

  const response = NextResponse.json(data || { status: 'CLEARED_WITH_ERROR' })
  response.cookies.set(GUEST_ROOM_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
