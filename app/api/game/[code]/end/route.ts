import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ code: string }> }

export async function POST(_request: Request, { params }: Context) {
  try {
    const { code } = await params
    const guest = await getGuestRoomSession(code)
    if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid atau kedaluwarsa' }, { status: 401 })

    const { data, error } = await supabaseServer().rpc('finalize_expired_game', {
      p_room_id: guest.roomId,
    })
    if (error) {
      const tooEarly = error.message.includes('belum habis')
      return NextResponse.json({ error: error.message }, { status: tooEarly ? 409 : 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error ending game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
