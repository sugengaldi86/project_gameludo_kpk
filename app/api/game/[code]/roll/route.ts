import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'
import { enforceGameDeadline } from '@/lib/game-deadline'

type Context = { params: Promise<{ code: string }> }

export async function POST(_request: Request, { params }: Context) {
  try {
    const { code } = await params
    const guest = await getGuestRoomSession(code)
    if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid atau kedaluwarsa' }, { status: 401 })
    const deadline = await enforceGameDeadline(guest.roomId)
    if (deadline.expired) return NextResponse.json({ error: deadline.error, expired: true }, { status: 409 })
    const supabase = supabaseServer()
    const { count, error: questionError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 })
    if (!count) return NextResponse.json({ error: 'Belum ada soal aktif. Aktifkan minimal satu soal dari dashboard admin.' }, { status: 409 })

    const { data: roll, error: rollError } = await supabase.rpc('roll_game_turn', { p_room_id: guest.roomId })
    if (rollError || !roll) return NextResponse.json({ error: rollError?.message || 'Dadu gagal dilempar' }, { status: 409 })
    let result = roll
    if (!result.question && result.questionId) {
      const { data: qData } = await supabase.from('questions').select('*, question_options(*)').eq('id', result.questionId).single()
      if (qData) {
        const options = (qData.question_options as Array<{ option_key: string; option_text: string }> | null) || []
        result = {
          ...result,
          question: {
            id: qData.id,
            code: qData.question_code,
            text: qData.story,
            difficulty: qData.difficulty,
            options: options
              .map((option) => ({ key: option.option_key, text: option.option_text }))
              .sort((first, second) => first.key.localeCompare(second.key))
          }
        }
      }
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/game/[code]/roll:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
