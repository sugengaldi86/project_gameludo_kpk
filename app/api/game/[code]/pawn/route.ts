import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'
import { enforceGameDeadline } from '@/lib/game-deadline'

type Context = { params: Promise<{ code: string }> }
export async function POST(request: Request, { params }: Context) {
  try {
    const { code } = await params
    const guest = await getGuestRoomSession(code)
    if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid atau kedaluwarsa' }, { status: 401 })
    const deadline = await enforceGameDeadline(guest.roomId)
    if (deadline.expired) return NextResponse.json({ error: deadline.error, expired: true }, { status: 409 })
    const { pawnId } = await request.json()
    if (typeof pawnId !== 'string') return NextResponse.json({ error: 'Pion tidak valid' }, { status: 400 })
    const supabase = supabaseServer()
    const { count, error: questionError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 })
    if (!count) return NextResponse.json({ error: 'Belum ada soal aktif. Aktifkan minimal satu soal dari dashboard admin.' }, { status: 409 })

    const { data, error } = await supabase.rpc('move_game_pawn', { p_room_id: guest.roomId, p_pawn_id: pawnId })
    if (error || !data) return NextResponse.json({ error: error?.message || 'Pion gagal digerakkan' }, { status: 409 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
