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

  let abandonResult = null
  try {
    const { data, error } = await supabaseServer().rpc('abandon_local_game', { p_room_id: guest.roomId })
    if (error) {
      console.warn('abandon_local_game RPC failed, falling back to direct update:', error.message)
      // Fallback: update using standard allowed status ('finished' / 'GAME_OVER')
      const supabase = supabaseServer()
      await Promise.allSettled([
        supabase.from('game_sessions').update({ status: 'GAME_OVER', finished_at: new Date().toISOString() }).eq('room_id', guest.roomId),
        supabase.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', guest.roomId),
        supabase.from('room_players').update({ is_online: false }).eq('room_id', guest.roomId),
        supabase.from('guest_room_sessions').delete().eq('room_id', guest.roomId),
      ])
      abandonResult = { status: 'GAME_OVER' }
    } else {
      abandonResult = data
    }
  } catch (err) {
    console.warn('Error during abandon game fallback:', err)
    abandonResult = { status: 'CLEARED' }
  }

  const response = NextResponse.json(abandonResult || { status: 'CLEARED' })
  response.cookies.set(GUEST_ROOM_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
