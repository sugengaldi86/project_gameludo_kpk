import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'
import { enforceGameDeadline } from '@/lib/game-deadline'

type Context = { params: Promise<{ code: string }> }
export async function POST(_request: Request, { params }: Context) {
  const { code } = await params
  const guest = await getGuestRoomSession(code)
  if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid atau kedaluwarsa' }, { status: 401 })
  const deadline = await enforceGameDeadline(guest.roomId)
  if (deadline.expired) return NextResponse.json({ error: deadline.error, expired: true }, { status: 409 })
  const { data, error } = await supabaseServer().rpc('advance_game_turn', { p_room_id: guest.roomId })
  if (error || !data) return NextResponse.json({ error: error?.message || 'Giliran gagal dipindahkan' }, { status: 409 })
  return NextResponse.json(data)
}
