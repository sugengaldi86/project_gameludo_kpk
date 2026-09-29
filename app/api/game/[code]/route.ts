import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ code: string }> }
type ExamState = {
  name?: string | null
  question_time_seconds?: number | null
  auto_submit?: boolean | null
  essay_question_count?: number | null
  multiple_choice_question_count?: number | null
}
type RoomState = {
  id: string
  room_code: string
  game_mode: string | null
  learning_goal: string | null
  status: string
  end_time: string | null
  exam_id: string | null
  exams?: ExamState | ExamState[] | null
}
type GameSessionState = {
  id: string
  current_player_id: string | null
  current_turn_number: number
  current_dice_value: number | null
  status: string
  winner_player_id: string | null
  exam_started_at?: string | null
  exam_deadline_at?: string | null
  submitted_at?: string | null
}
type QuestionState = {
  id: string
  question_code: string
  story: string
  question_type: 'essay' | 'multiple_choice'
  question_options?: Array<{ option_key: string; option_text: string }> | null
}
type ActiveTurnState = {
  question_id: string | null
  is_correct: boolean | null
  started_at: string | null
  questions?: QuestionState | QuestionState[] | null
}

type DbError = { code?: string; message?: string } | null
function isSchemaError(error: DbError) {
  const message = error?.message || ''
  return Boolean(error && (['PGRST200', 'PGRST204', '42703', '42P01'].includes(error.code || '') || message.includes('schema cache') || message.includes('relationship')))
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { code } = await params
    const guest = await getGuestRoomSession(code)
    if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid atau kedaluwarsa' }, { status: 401 })
    const supabase = supabaseServer()

    // Jalur cepat: satu round-trip database untuk seluruh state permainan.
    // Fallback di bawah tetap dipakai sampai migration 20261013 diterapkan.
    const fastState = await supabase.rpc('get_game_state_fast', { p_room_id: guest.roomId })
    if (!fastState.error && fastState.data) return NextResponse.json(fastState.data)
    const missingFastStateRpc = ['PGRST202', '42883'].includes(fastState.error?.code || '')
      || fastState.error?.message?.includes('get_game_state_fast')
    if (!missingFastStateRpc) {
      console.error('[get_game_state_fast] Falling back to legacy state queries:', fastState.error?.message)
    }

    const [roomResult, sessionResult, playersResult] = await Promise.all([
      supabase.from('rooms').select('id,room_code,game_mode,learning_goal,status,end_time,exam_id,exams(name,question_time_seconds,auto_submit,essay_question_count,multiple_choice_question_count)').eq('id', guest.roomId).single(),
      supabase.from('game_sessions').select('id,current_player_id,current_turn_number,current_dice_value,status,winner_player_id,exam_started_at,exam_deadline_at,submitted_at').eq('room_id', guest.roomId).single(),
      supabase.from('room_players').select('player_id,display_name,color,seat_number,score,xp_earned,correct_answers,wrong_answers,streak,profiles(level,total_xp,total_score)').eq('room_id', guest.roomId).order('seat_number'),
    ])
    let room: RoomState | null = roomResult.data
    let roomError = roomResult.error
    let gameSession: GameSessionState | null = sessionResult.data
    let sessionError = sessionResult.error
    const { data: players, error: playersError } = playersResult

    if (isSchemaError(roomError)) {
      const legacyRoom = await supabase.from('rooms').select('id,room_code,game_mode,learning_goal,status,end_time,exam_id').eq('id', guest.roomId).single()
      room = legacyRoom.data ? { ...legacyRoom.data, exams: null } : null
      roomError = legacyRoom.error
    }
    if (isSchemaError(sessionError)) {
      const legacySession = await supabase.from('game_sessions').select('id,current_player_id,current_turn_number,current_dice_value,status,winner_player_id').eq('room_id', guest.roomId).single()
      gameSession = legacySession.data ? { ...legacySession.data, exam_started_at: null, exam_deadline_at: null, submitted_at: null } : null
      sessionError = legacySession.error
    }

    const stateError = roomError || sessionError || playersError
    if (stateError) return NextResponse.json({ error: stateError.message }, { status: 500 })
    if (!room || !gameSession || !players) return NextResponse.json({ error: 'State permainan tidak lengkap' }, { status: 404 })

    if (room.status === 'playing' && room.end_time && new Date(room.end_time).getTime() <= Date.now()) {
      const { error: finalizeError } = await supabase.rpc('finalize_expired_game', { p_room_id: guest.roomId })
      if (finalizeError) {
        // Jika permission denied (belum ada GRANT), log dan skip — state akan tetap dimuat.
        // Jalankan SQL berikut di Supabase SQL Editor untuk memperbaiki secara permanen:
        // grant execute on function public.finalize_expired_game(uuid) to service_role;
        if (finalizeError.message.includes('permission denied')) {
          console.error('[finalize_expired_game] Permission denied — jalankan GRANT di Supabase SQL Editor:', finalizeError.message)
        } else {
          return NextResponse.json({ error: finalizeError.message }, { status: 500 })
        }
      } else {
        const [freshRoom, freshSession] = await Promise.all([
          supabase.from('rooms').select('id,room_code,game_mode,learning_goal,status,end_time,exam_id,exams(name,question_time_seconds,auto_submit,essay_question_count,multiple_choice_question_count)').eq('id', guest.roomId).single(),
          supabase.from('game_sessions').select('id,current_player_id,current_turn_number,current_dice_value,status,winner_player_id,exam_started_at,exam_deadline_at,submitted_at').eq('room_id', guest.roomId).single(),
        ])
        room = freshRoom.data || room
        gameSession = freshSession.data || gameSession
        roomError = isSchemaError(freshRoom.error) ? null : freshRoom.error
        sessionError = isSchemaError(freshSession.error) ? null : freshSession.error
        if (roomError || sessionError || !room || !gameSession) {
          return NextResponse.json({ error: roomError?.message || sessionError?.message || 'Finalisasi permainan gagal dimuat' }, { status: 500 })
        }
      }
    }

    const [{ data: pawns, error: pawnsError }, activeTurnResult] = await Promise.all([
      supabase.from('game_pawns').select('id,player_id,pawn_number,status,position').eq('game_session_id', gameSession.id),
      supabase.from('game_turns')
        .select('question_id,is_correct,started_at,questions(id,question_code,story,question_type,question_options(option_key,option_text))')
        .eq('game_session_id', gameSession.id)
        .eq('turn_number', gameSession.current_turn_number)
        .is('is_correct', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    let activeTurn: ActiveTurnState | null = activeTurnResult.data
    let turnError = activeTurnResult.error
    if (isSchemaError(turnError)) {
      const legacyTurn = await supabase.from('game_turns').select('question_id,is_correct,started_at').eq('game_session_id', gameSession.id).eq('turn_number', gameSession.current_turn_number).is('is_correct', null).order('started_at', { ascending: false }).limit(1).maybeSingle()
      activeTurn = legacyTurn.data ? { ...legacyTurn.data, questions: null } : null
      turnError = legacyTurn.error
    }
    if (pawnsError || turnError) return NextResponse.json({ error: pawnsError?.message || turnError?.message }, { status: 500 })

    const questionRelation = activeTurn?.questions
    let question: QuestionState | null = Array.isArray(questionRelation) ? questionRelation[0] : questionRelation || null
    if (!question && activeTurn?.question_id) {
      const { data: qData } = await supabase.from('questions').select('id,question_code,story,question_type,question_options(option_key,option_text)').eq('id', activeTurn.question_id).maybeSingle()
      question = qData
    }
    const activeQuestion = question ? {
      id: question.id,
      code: question.question_code,
      content: question.story,
      type: question.question_type,
      options: [...(question.question_options || [])]
        .sort((a, b) => a.option_key.localeCompare(b.option_key))
        .map((opt) => ({ key: opt.option_key, text: opt.option_text })),
    } : null

    const examRelation = room.exams
    const exam = Array.isArray(examRelation) ? examRelation[0] : examRelation
    const questionDeadlineAt = activeTurn?.started_at && exam?.question_time_seconds
      ? new Date(new Date(activeTurn.started_at).getTime() + exam.question_time_seconds * 1000).toISOString()
      : null
    const [essayResult, choiceResult] = await Promise.all([
      supabase.from('player_essay_answers').select('*', { count: 'exact', head: true }).eq('game_session_id', gameSession.id),
      supabase.from('player_answers').select('*', { count: 'exact', head: true }).eq('game_session_id', gameSession.id),
    ])
    const essayCount = isSchemaError(essayResult.error) ? 0 : essayResult.count || 0
    const choiceCount = choiceResult.count || 0
    return NextResponse.json({ room, session: gameSession, players, pawns: pawns || [], activeQuestion, questionDeadlineAt, progress: { essay: essayCount, multipleChoice: choiceCount, total: essayCount + choiceCount }, targets: { essay: exam?.essay_question_count ?? 5, multipleChoice: exam?.multiple_choice_question_count ?? 10 } })
  } catch (error) {
    console.error('Error in GET /api/game/[code]:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
