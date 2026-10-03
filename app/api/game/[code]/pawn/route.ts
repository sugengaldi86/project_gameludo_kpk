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
    const { data: initialSession, error: initialSessionError } = await supabase
      .from('game_sessions')
      .select('status')
      .eq('room_id', guest.roomId)
      .single()
    if (initialSessionError) return NextResponse.json({ error: initialSessionError.message }, { status: 500 })
    if (initialSession.status !== 'PAWN_SELECTION') {
      // Request kedua dari double click: aksi pertama sudah menggerakkan pion.
      // Perlakukan sebagai sukses idempoten agar browser tidak mencatat 409.
      if (initialSession.status === 'QUIZ') return NextResponse.json({ alreadyMoved: true, nextStatus: 'QUIZ' })
      return NextResponse.json({ error: 'Pion belum dapat digerakkan' }, { status: 409 })
    }
    const { data, error } = await supabase.rpc('move_game_pawn', { p_room_id: guest.roomId, p_pawn_id: pawnId })
    if (error || !data) {
      // Dua request dapat lolos dari pre-check sebelum RPC pertama selesai.
      // RPC mengunci session; cek ulang state sesudah lock dilepas.
      const { data: latestSession } = await supabase.from('game_sessions').select('status').eq('room_id', guest.roomId).single()
      if (latestSession?.status === 'QUIZ') return NextResponse.json({ alreadyMoved: true, nextStatus: 'QUIZ' })
      return NextResponse.json({ error: error?.message || 'Pion gagal digerakkan' }, { status: 409 })
    }
    const [{ data: session }, { data: room }] = await Promise.all([
      supabase.from('game_sessions').select('id,current_turn_number').eq('room_id', guest.roomId).single(),
      supabase.from('rooms').select('exams(essay_question_count,multiple_choice_question_count,difficulty,randomize_questions,randomize_options,exam_questions(question_id,position))').eq('id', guest.roomId).single(),
    ])
    if (!session || data.nextStatus !== 'QUIZ') return NextResponse.json(data)
    const [{ data: essayAnswers, count: essayCount }, { data: choiceAnswers, count: choiceCount }] = await Promise.all([
      supabase.from('player_essay_answers').select('question_id', { count: 'exact' }).eq('game_session_id', session.id),
      supabase.from('player_answers').select('question_id', { count: 'exact' }).eq('game_session_id', session.id),
    ])
    const relation = room?.exams
    const exam = Array.isArray(relation) ? relation[0] : relation
    const essayTarget = exam?.essay_question_count ?? 5
    const choiceTarget = exam?.multiple_choice_question_count ?? 10
    const desiredType = (essayCount || 0) < essayTarget ? 'essay' : 'multiple_choice'
    const usedIds = [...(essayAnswers || []), ...(choiceAnswers || [])].map(answer => answer.question_id).filter(Boolean)
    const manualQuestionIds = (exam?.exam_questions || []).map(item => item.question_id)
    const createCandidateQuery = () => {
      let candidateQuery = supabase.from('questions').select('id,question_code,story,question_type,difficulty,display_order,question_options(option_key,option_text)').eq('is_active', true).eq('question_type', desiredType).order('display_order').order('created_at')
      if (exam?.difficulty) candidateQuery = candidateQuery.eq('difficulty', exam.difficulty)
      if (manualQuestionIds.length) candidateQuery = candidateQuery.in('id', manualQuestionIds)
      return candidateQuery
    }
    let query = createCandidateQuery()
    if (usedIds.length) query = query.not('id', 'in', `(${usedIds.join(',')})`)
    let { data: candidates, error: candidateError } = await query.limit(20)

    // Jika target lebih besar daripada jumlah soal unik, ulangi soal dari fase
    // yang sama. Jangan mengganti uraian menjadi pilihan ganda secara diam-diam.
    if (!candidateError && usedIds.length && (!candidates || candidates.length === 0)) {
      const reusable = await createCandidateQuery().limit(20)
      candidates = reusable.data
      candidateError = reusable.error
    }
    if (candidateError || !candidates?.length) return NextResponse.json({ error: candidateError?.message || `Soal aktif tipe ${desiredType === 'essay' ? 'uraian' : 'pilihan ganda'} untuk konfigurasi ujian ini belum tersedia` }, { status: 409 })
    const difficultyRank: Record<string, number> = { mudah: 0, sedang: 1, hots: 2, tiga_bilangan: 2 }
    const manualPosition = new Map((exam?.exam_questions || []).map(item => [item.question_id, item.position ?? Number.MAX_SAFE_INTEGER]))
    const orderedCandidates = [...candidates].sort((first, second) => {
      const difficultyDifference = (difficultyRank[first.difficulty] ?? 1) - (difficultyRank[second.difficulty] ?? 1)
      if (difficultyDifference !== 0) return difficultyDifference
      const manualDifference = (manualPosition.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (manualPosition.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      if (manualDifference !== 0) return manualDifference
      return (first.display_order || 0) - (second.display_order || 0)
    })
    const question = exam?.randomize_questions === false
      ? orderedCandidates[0]
      : candidates[Math.floor(Math.random() * candidates.length)]
    const { error: turnError } = await supabase.from('game_turns').update({ question_id: question.id }).eq('game_session_id', session.id).eq('turn_number', session.current_turn_number)
    if (turnError) return NextResponse.json({ error: turnError.message }, { status: 500 })
    return NextResponse.json({ ...data, phase: question.question_type, targets: { essay: essayTarget, multipleChoice: choiceTarget }, progress: question.question_type === 'essay' ? `${(essayCount || 0) + 1}/${essayTarget}` : `${(choiceCount || 0) + 1}/${choiceTarget}`, question: {
      id: question.id, code: question.question_code, content: question.story,
      type: question.question_type,
      options: [...(question.question_options || [])]
        .sort(exam?.randomize_options ? () => Math.random() - 0.5 : (a, b) => a.option_key.localeCompare(b.option_key))
        .map(option => ({ key: option.option_key, text: option.option_text })),
    } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
