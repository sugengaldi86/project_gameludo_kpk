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
    const isEssayQuestion = body.questionType === 'essay' || body.answerText !== undefined
    const isValidMultipleChoice = typeof body.questionId === 'string' && ['A', 'B', 'C', 'D', '__TIMEOUT__'].includes(body.selectedOption)
    const isValidEssayAnswer = typeof body.questionId === 'string' && typeof body.answerText === 'string' && body.answerText.trim().length > 0
    if (!isValidMultipleChoice && !isValidEssayAnswer) {
      return NextResponse.json({ error: 'Jawaban tidak valid' }, { status: 400 })
    }

    const supabase = supabaseServer()

    // Cek status sesi SEBELUM memanggil RPC
    const { data: session } = await supabase
      .from('game_sessions')
      .select('id, status, current_turn_number, current_player_id')
      .eq('room_id', guest.roomId)
      .single()

    if (!session) return NextResponse.json({ error: 'Sesi permainan tidak ditemukan' }, { status: 404 })

    // Jika sesi tidak dalam status QUIZ, jawaban sudah diproses → kembalikan 200 senyap
    if (session.status !== 'QUIZ') {
      return NextResponse.json({ alreadyAnswered: true })
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('exams(question_time_seconds,essay_question_count,multiple_choice_question_count)')
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

    if (isEssayQuestion) {
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('id, question_code, question_type, known_information, asked_information, strategy, final_explanation, question_solutions(method, steps, result)')
        .eq('id', body.questionId)
        .single()

      if (questionError || !question) {
        return NextResponse.json({ error: 'Soal uraian tidak ditemukan' }, { status: 404 })
      }

      const { data: answer, error: answerError } = await supabase.rpc('answer_game_turn', {
        p_room_id: guest.roomId,
        p_question_id: question.id,
        p_selected_option: body.answerText,
      })

      if (answerError || !answer) {
        console.warn('[answer] essay RPC failed:', answerError?.message || 'answer_game_turn returned null')
        return NextResponse.json({ error: answerError?.message || 'Jawaban uraian gagal disimpan' }, { status: 409 })
      }

      const solutions = Array.isArray(question.question_solutions) ? question.question_solutions : []
      return NextResponse.json({
        isCorrect: null,
        scoreAwarded: 0,
        xpAwarded: 0,
        correctOption: null,
        turnAdvanced: true,
        timedOut,
        feedback: 'Jawaban berhasil disimpan. Nilai akan divalidasi oleh guru.',
        explanation: {
          knownInformation: question.known_information,
          askedInformation: question.asked_information,
          strategy: question.strategy,
          finalExplanation: question.final_explanation,
          solutions,
        },
        nextTurn: answer.nextTurn,
      })
    }

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

    const answerPayload = typeof answer === 'object' && answer ? answer as Record<string, unknown> : {}
    if (!answerPayload.explanation) {
      const [{ data: question }, { data: solutions }] = await Promise.all([
        supabase.from('questions').select('known_information,asked_information,strategy,final_explanation').eq('id', body.questionId).maybeSingle(),
        supabase.from('question_solutions').select('method,steps,result').eq('question_id', body.questionId),
      ])
      answerPayload.explanation = {
        knownInformation: question?.known_information || null,
        askedInformation: question?.asked_information || null,
        strategy: question?.strategy || null,
        finalExplanation: question?.final_explanation || null,
        solutions: solutions || [],
      }
    }

    const [{ count: essayCount }, { count: choiceCount }] = await Promise.all([
      supabase.from('player_essay_answers').select('*', { count: 'exact', head: true }).eq('game_session_id', session.id),
      supabase.from('player_answers').select('*', { count: 'exact', head: true }).eq('game_session_id', session.id),
    ])
    const essayTarget = exam?.essay_question_count ?? 5
    const choiceTarget = exam?.multiple_choice_question_count ?? 10
    const gameComplete = (essayCount || 0) >= essayTarget && (choiceCount || 0) >= choiceTarget
    if (gameComplete) await supabase.rpc('finalize_completed_game', { p_room_id: guest.roomId })
    return NextResponse.json({ ...answerPayload, timedOut, gameComplete, progress: { essay: essayCount || 0, multipleChoice: choiceCount || 0 }, targets: { essay: essayTarget, multipleChoice: choiceTarget } })
  } catch (error) {
    console.error('Error in POST /api/game/[code]/answer:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
