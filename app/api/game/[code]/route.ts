import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ code: string }> }
export async function GET(_request: Request, { params }: Context) {
  const { code } = await params
  const guest = await getGuestRoomSession(code)
  if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid atau kedaluwarsa' }, { status: 401 })
  const supabase = supabaseServer()
  const [roomResult, sessionResult, { data: players, error: playersError }] = await Promise.all([
    supabase.from('rooms').select('id,room_code,game_mode,learning_goal,status,end_time,exam_id,exams(name,question_time_seconds,auto_submit)').eq('id', guest.roomId).single(),
    supabase.from('game_sessions').select('id,current_player_id,current_turn_number,current_dice_value,status,winner_player_id,exam_started_at,exam_deadline_at,submitted_at').eq('room_id', guest.roomId).single(),
    supabase.from('room_players').select('player_id,display_name,color,seat_number,score,xp_earned,correct_answers,wrong_answers,streak,profiles(level,total_xp,total_score)').eq('room_id', guest.roomId).order('seat_number'),
  ])
  let { data: room, error: roomError } = roomResult
  let { data: gameSession, error: sessionError } = sessionResult
  const stateError = roomError || sessionError || playersError
  if (stateError) return NextResponse.json({ error: stateError.message }, { status: 500 })
  if (!room || !gameSession || !players) return NextResponse.json({ error: 'State permainan tidak lengkap' }, { status: 404 })

  if (room.status === 'playing' && room.end_time && new Date(room.end_time).getTime() <= Date.now()) {
    const { error: finalizeError } = await supabase.rpc('finalize_expired_game', { p_room_id: guest.roomId })
    if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 })

    const [freshRoom, freshSession] = await Promise.all([
      supabase.from('rooms').select('id,room_code,game_mode,learning_goal,status,end_time,exam_id,exams(name,question_time_seconds,auto_submit)').eq('id', guest.roomId).single(),
      supabase.from('game_sessions').select('id,current_player_id,current_turn_number,current_dice_value,status,winner_player_id,exam_started_at,exam_deadline_at,submitted_at').eq('room_id', guest.roomId).single(),
    ])
    room = freshRoom.data
    gameSession = freshSession.data
    roomError = freshRoom.error
    sessionError = freshSession.error
    if (roomError || sessionError || !room || !gameSession) {
      return NextResponse.json({ error: roomError?.message || sessionError?.message || 'Finalisasi permainan gagal dimuat' }, { status: 500 })
    }
  }

  const [{ data: pawns, error: pawnsError }, { data: activeTurn, error: turnError }] = await Promise.all([
    supabase.from('game_pawns').select('id,player_id,pawn_number,status,position').eq('game_session_id', gameSession.id),
    supabase.from('game_turns')
      .select('question_id,is_correct,started_at,questions(id,question_code,story,question_options(option_key,option_text))')
      .eq('game_session_id', gameSession.id)
      .eq('turn_number', gameSession.current_turn_number)
      .is('is_correct', null)
      .maybeSingle(),
  ])
  if (pawnsError || turnError) return NextResponse.json({ error: pawnsError?.message || turnError?.message }, { status: 500 })

  const questionRelation = activeTurn?.questions
  const question = Array.isArray(questionRelation) ? questionRelation[0] : questionRelation
  const activeQuestion = question ? {
    id: question.id,
    code: question.question_code,
    // 'content' digunakan di QuestionModal, diisi dari kolom 'story' di database
    content: question.story,
    options: [...(question.question_options || [])]
      .sort((a, b) => a.option_key.localeCompare(b.option_key))
      .map((opt) => ({ key: opt.option_key, text: opt.option_text })),
  } : null

  const examRelation = room.exams
  const exam = Array.isArray(examRelation) ? examRelation[0] : examRelation
  const questionDeadlineAt = activeTurn?.started_at && exam?.question_time_seconds
    ? new Date(new Date(activeTurn.started_at).getTime() + exam.question_time_seconds * 1000).toISOString()
    : null
  return NextResponse.json({ room, session: gameSession, players, pawns: pawns || [], activeQuestion, questionDeadlineAt })
}
