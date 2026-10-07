import { NextResponse } from 'next/server'
import { getGuestRoomSession } from '@/lib/guest-session'
import { enforceGameDeadline } from '@/lib/game-deadline'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ code: string }> }
export async function POST(request: Request, { params }: Context) {
  try {
    const { code } = await params
    const guest = await getGuestRoomSession(code)
    if (!guest) return NextResponse.json({ error: 'Sesi pemain tidak valid' }, { status: 401 })
    const deadline = await enforceGameDeadline(guest.roomId)
    if (deadline.expired) return NextResponse.json({ error: deadline.error }, { status: 410 })
    const body = await request.json()
    const fields = ['known', 'asked', 'plan', 'solution', 'check'] as const
    if (typeof body.questionId !== 'string' || fields.some(key => typeof body[key] !== 'string' || !body[key].trim())) return NextResponse.json({ error: 'Semua tahap jawaban wajib diisi' }, { status: 400 })
    if (!['multiples','prime_factorization','repeated_division'].includes(body.method)) return NextResponse.json({ error: 'Pilih satu metode penyelesaian' }, { status: 400 })
    const supabase = supabaseServer()

    // Jalur atomik: lock session/turn, insert jawaban, update state, dan hitung
    // progres dilakukan dalam satu transaksi database.
    const atomicResult = await supabase.rpc('submit_essay_game_turn', {
      p_room_id: guest.roomId,
      p_question_id: body.questionId,
      p_answer: {
        known: body.known.trim(), asked: body.asked.trim(), plan: body.plan.trim(),
        solution: body.solution.trim(), check: body.check.trim(), method: body.method,
      },
    })
    const missingAtomicRpc = ['PGRST202', '42883'].includes(atomicResult.error?.code || '')
      || atomicResult.error?.message?.includes('submit_essay_game_turn')
    if (!atomicResult.error && atomicResult.data) {
      const result = atomicResult.data as {
        saved?: boolean; alreadyAnswered?: boolean; showExplanation?: boolean; gameComplete?: boolean
        essayCount?: number; choiceCount?: number; targets?: { essay: number; multipleChoice: number }
      }
      if (result.alreadyAnswered) return NextResponse.json(result)
      // Selalu ambil explanation — pembahasan referensi wajib tampil untuk uraian
      const [{ data: question }, { data: solutions }] = await Promise.all([
        supabase.from('questions').select('known_information,asked_information,strategy,final_explanation,answer_solution,answer_know_image_url,answer_asked_image_url,answer_plan_image_url,answer_solution_image_url,answer_check_image_url').eq('id', body.questionId).maybeSingle(),
        supabase.from('question_solutions').select('method,steps,result').eq('question_id', body.questionId),
      ])
      const explanation = {
        knownInformation: question?.known_information || null,
        knownInformationImageUrl: question?.answer_know_image_url || null,
        askedInformation: question?.asked_information || null,
        askedInformationImageUrl: question?.answer_asked_image_url || null,
        strategy: question?.strategy || null,
        strategyImageUrl: question?.answer_plan_image_url || null,
        solution: question?.answer_solution || null,
        solutionImageUrl: question?.answer_solution_image_url || null,
        finalExplanation: question?.final_explanation || null,
        finalExplanationImageUrl: question?.answer_check_image_url || null,
        solutions: solutions || [],
      }
      return NextResponse.json({
        saved: true, explanation,
        feedbackDeferred: false,
        gameComplete: Boolean(result.gameComplete), essayCount: result.essayCount || 0,
        choiceCount: result.choiceCount || 0, targets: result.targets,
      })
    }
    if (!missingAtomicRpc) {
      const duplicate = atomicResult.error?.code === '23505'
      return NextResponse.json({ error: duplicate ? 'Jawaban sudah tersimpan' : atomicResult.error?.message || 'Jawaban gagal disimpan' }, { status: duplicate ? 409 : 500 })
    }

    // Fallback kompatibilitas sebelum migration 20261013 diterapkan.
    const [{ data: session, error: sessionError }, { data: room, error: roomError }] = await Promise.all([
      supabase.from('game_sessions').select('id,status,current_player_id,current_turn_number').eq('room_id', guest.roomId).single(),
      supabase.from('rooms').select('exams(essay_question_count,multiple_choice_question_count,feedback_timing)').eq('id', guest.roomId).single(),
    ])
    if (sessionError || roomError) throw sessionError || roomError
    if (!session) return NextResponse.json({ error: 'Sesi permainan tidak ditemukan' }, { status: 404 })
    if (session.status !== 'QUIZ') return NextResponse.json({ alreadyAnswered: true })
    if (!session.current_player_id) return NextResponse.json({ error: 'Pemain aktif tidak ditemukan' }, { status: 409 })
    const { data: turn, error: turnError } = await supabase.from('game_turns').select('id,question_id').eq('game_session_id', session.id).eq('turn_number', session.current_turn_number).single()
    if (turnError) throw turnError
    if (!turn || turn.question_id !== body.questionId) return NextResponse.json({ error: 'Soal tidak lagi aktif' }, { status: 409 })

    const answer = {
      game_session_id: session.id,
      turn_id: turn.id,
      player_id: session.current_player_id,
      question_id: body.questionId,
      known_answer: body.known.trim(),
      asked_answer: body.asked.trim(),
      plan_answer: body.plan.trim(),
      solution_answer: body.solution.trim(),
      check_answer: body.check.trim(),
      solution_method: body.method,
    }
    let { error } = await supabase.from('player_essay_answers').insert(answer)

    // Kompatibilitas untuk database yang baru menjalankan migrasi learning_flow,
    // tetapi belum memiliki kolom plan_answer dari migrasi Polya berikutnya.
    if (error && ['PGRST204', '42703'].includes(error.code) && error.message.includes('plan_answer')) {
      const { plan_answer, ...legacyAnswer } = answer
      console.warn('[essay-answer] Kolom plan_answer belum tersedia; menyimpan rencana bersama langkah penyelesaian.', plan_answer.length)
      const retry = await supabase.from('player_essay_answers').insert({
        ...legacyAnswer,
        solution_answer: `Rencana:\n${plan_answer}\n\nPelaksanaan:\n${legacyAnswer.solution_answer}`,
      })
      error = retry.error
    }
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'Jawaban sudah tersimpan' : error.message }, { status: error.code === '23505' ? 409 : 500 })
    const [turnUpdate, sessionUpdate] = await Promise.all([
      supabase.from('game_turns').update({ finished_at: new Date().toISOString() }).eq('id', turn.id),
      supabase.from('game_sessions').update({ status: 'TURN_END' }).eq('id', session.id),
    ])
    if (turnUpdate.error || sessionUpdate.error) throw turnUpdate.error || sessionUpdate.error

    // Ambil explanation untuk ditampilkan
    const [{ data: question }, { data: solutions }] = await Promise.all([
      supabase.from('questions').select('known_information,asked_information,strategy,final_explanation,answer_solution,answer_know_image_url,answer_asked_image_url,answer_plan_image_url,answer_solution_image_url,answer_check_image_url').eq('id', body.questionId).maybeSingle(),
      supabase.from('question_solutions').select('method,steps,result').eq('question_id', body.questionId),
    ])
    const explanation = {
      knownInformation: question?.known_information || null,
      knownInformationImageUrl: question?.answer_know_image_url || null,
      askedInformation: question?.asked_information || null,
      askedInformationImageUrl: question?.answer_asked_image_url || null,
      strategy: question?.strategy || null,
      strategyImageUrl: question?.answer_plan_image_url || null,
      solution: question?.answer_solution || null,
      solutionImageUrl: question?.answer_solution_image_url || null,
      finalExplanation: question?.final_explanation || null,
      finalExplanationImageUrl: question?.answer_check_image_url || null,
      solutions: solutions || [],
    }

    const [{ count: essayCount }, { count: choiceCount }] = await Promise.all([
      supabase.from('player_essay_answers').select('*', { count: 'exact', head: true }).eq('game_session_id', session.id),
      supabase.from('player_answers').select('*', { count: 'exact', head: true }).eq('game_session_id', session.id),
    ])
    const relation = room?.exams
    const exam = Array.isArray(relation) ? relation[0] : relation
    const essayTarget = exam?.essay_question_count ?? 5
    const choiceTarget = exam?.multiple_choice_question_count ?? 10
    const gameComplete = (essayCount || 0) >= essayTarget && (choiceCount || 0) >= choiceTarget
    if (gameComplete) await supabase.rpc('finalize_completed_game', { p_room_id: guest.roomId })
    // Pembahasan referensi selalu ditampilkan untuk soal uraian.
    // Nilai uraian tetap menunggu validasi guru; feedbackDeferred tetap false
    // agar frontend tahu giliran sudah berpindah tanpa menunggu penilaian.
    return NextResponse.json({ saved: true, explanation, feedbackDeferred: false, gameComplete, essayCount: essayCount || 0, choiceCount: choiceCount || 0, targets: { essay: essayTarget, multipleChoice: choiceTarget } })
  } catch (error) {
    console.error('Error in POST /api/game/[code]/essay-answer:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
