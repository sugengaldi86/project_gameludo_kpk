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
    if (deadline.expired) return NextResponse.json({ error: deadline.error, expired: true }, { status: 410 })

    const body = await request.json()
    if (typeof body.questionId !== 'string' || !['A', 'B', 'C', 'D', '__TIMEOUT__'].includes(body.selectedOption)) {
      return NextResponse.json({ error: 'Jawaban tidak valid' }, { status: 400 })
    }

    const supabase = supabaseServer()

    // Cek status sesi SEBELUM memanggil RPC
    const { data: session } = await supabase
      .from('game_sessions')
      .select('id, status, current_turn_number')
      .eq('room_id', guest.roomId)
      .single()

    if (!session) return NextResponse.json({ error: 'Sesi permainan tidak ditemukan' }, { status: 404 })

    // Jika sesi tidak dalam status QUIZ, jawaban sudah diproses → kembalikan 200 senyap
    if (session.status !== 'QUIZ') {
      return NextResponse.json({ alreadyAnswered: true })
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('exams(question_time_seconds)')
      .eq('id', guest.roomId)
      .single()

    const { data: activeTurn } = await supabase
      .from('game_turns')
      .select('started_at')
      .eq('game_session_id', session.id)
      .eq('turn_number', session.current_turn_number)
      .maybeSingle()

    const examRelation = room?.exams
    const exam = Array.isArray(examRelation) ? examRelation[0] : examRelation
    const limit = exam?.question_time_seconds || null
    // Tambahkan grace period 5 detik untuk mengkompensasi:
    // 1. Clock skew (perbedaan jam antara localhost dan server database Supabase)
    // 2. Delay animasi frontend sebelum modal benar-benar terbuka
    const GRACE_PERIOD_MS = 5000
    const timedOut = Boolean(limit && activeTurn?.started_at && Date.now() >= new Date(activeTurn.started_at).getTime() + (limit * 1000) + GRACE_PERIOD_MS)
    const selectedOption = timedOut ? '__TIMEOUT__' : body.selectedOption

    const { data: answer, error: answerError } = await supabase.rpc('answer_game_turn', {
      p_room_id: guest.roomId,
      p_question_id: body.questionId,
      p_selected_option: selectedOption,
    })

    if (answerError) {
      // Semua error dari SQL = state sudah berubah (race condition) → kembalikan 200 senyap
      console.warn('[answer] RPC error (mungkin race condition):', answerError.message)
      return NextResponse.json({ alreadyAnswered: true })
    }

    if (!answer) return NextResponse.json({ alreadyAnswered: true })

    return NextResponse.json({ ...answer, timedOut })
  } catch (error) {
    console.error('Error in POST /api/game/[code]/answer:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
