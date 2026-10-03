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
    
    // Jika pion bisa bergerak, langsung return hasil roll
    if (roll.canMovePawn) {
      return NextResponse.json(roll)
    }

    // Jika pion TIDAK bisa bergerak, tentukan soal yang sesuai fase (Uraian dulu, lalu Pilihan Ganda)
    const [{ data: session }, { data: room }] = await Promise.all([
      supabase.from('game_sessions').select('id,current_turn_number').eq('room_id', guest.roomId).single(),
      supabase.from('rooms').select('exams(essay_question_count,multiple_choice_question_count,difficulty,randomize_questions,randomize_options,exam_questions(question_id,position))').eq('id', guest.roomId).single(),
    ])

    if (!session) return NextResponse.json(roll)

    const [{ data: essayAnswers, count: essayCount }, { data: choiceAnswers, count: choiceCount }] = await Promise.all([
      supabase.from('player_essay_answers').select('question_id', { count: 'exact' }).eq('game_session_id', session.id),
      supabase.from('player_answers').select('question_id', { count: 'exact' }).eq('game_session_id', session.id),
    ])

    const relation = room?.exams
    const exam = Array.isArray(relation) ? relation[0] : relation
    const essayTarget = exam?.essay_question_count ?? 5
    const choiceTarget = exam?.multiple_choice_question_count ?? 10
    const desiredType = (essayCount || 0) < essayTarget ? 'essay' : 'multiple_choice'

    const usedIds = [...(essayAnswers || []), ...(choiceAnswers || [])].map(a => a.question_id).filter(Boolean)
    const manualQuestionIds = (exam?.exam_questions || []).map(item => item.question_id)

    const createCandidateQuery = () => {
      let q = supabase.from('questions').select('id,question_code,story,question_type,difficulty,display_order,question_options(option_key,option_text)').eq('is_active', true).eq('question_type', desiredType).order('display_order').order('created_at')
      if (exam?.difficulty) q = q.eq('difficulty', exam.difficulty)
      if (manualQuestionIds.length) q = q.in('id', manualQuestionIds)
      return q
    }

    let query = createCandidateQuery()
    if (usedIds.length) query = query.not('id', 'in', `(${usedIds.join(',')})`)
    let { data: candidates, error: candidateError } = await query.limit(20)

    if (!candidateError && usedIds.length && (!candidates || candidates.length === 0)) {
      const reusable = await createCandidateQuery().limit(20)
      candidates = reusable.data
      candidateError = reusable.error
    }

    if (candidateError || !candidates?.length) {
      // Fallback ke soal apa saja yang aktif jika tipe spesifik tidak ada
      const fallback = await supabase.from('questions').select('id,question_code,story,question_type,difficulty,display_order,question_options(option_key,option_text)').eq('is_active', true).limit(10)
      candidates = fallback.data || []
    }

    if (candidates && candidates.length > 0) {
      const difficultyRank: Record<string, number> = { mudah: 0, sedang: 1, hots: 2, tiga_bilangan: 2 }
      const manualPosition = new Map((exam?.exam_questions || []).map(item => [item.question_id, item.position ?? Number.MAX_SAFE_INTEGER]))
      const orderedCandidates = [...candidates].sort((first, second) => {
        const difficultyDifference = (difficultyRank[first.difficulty] ?? 1) - (difficultyRank[second.difficulty] ?? 1)
        if (difficultyDifference !== 0) return difficultyDifference
        const manualDifference = (manualPosition.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (manualPosition.get(second.id) ?? Number.MAX_SAFE_INTEGER)
        if (manualDifference !== 0) return manualDifference
        return (first.display_order || 0) - (second.display_order || 0)
      })
      const selectedQ = exam?.randomize_questions === false
        ? orderedCandidates[0]
        : candidates[Math.floor(Math.random() * candidates.length)]

      await supabase.from('game_turns').update({ question_id: selectedQ.id }).eq('game_session_id', session.id).eq('turn_number', session.current_turn_number)

      return NextResponse.json({
        ...roll,
        phase: selectedQ.question_type,
        targets: { essay: essayTarget, multipleChoice: choiceTarget },
        progress: selectedQ.question_type === 'essay' ? `${(essayCount || 0) + 1}/${essayTarget}` : `${(choiceCount || 0) + 1}/${choiceTarget}`,
        question: {
          id: selectedQ.id,
          code: selectedQ.question_code,
          content: selectedQ.story,
          text: selectedQ.story,
          type: selectedQ.question_type,
          difficulty: selectedQ.difficulty,
          options: [...(selectedQ.question_options || [])]
            .sort(exam?.randomize_options ? () => Math.random() - 0.5 : (a, b) => a.option_key.localeCompare(b.option_key))
            .map(opt => ({ key: opt.option_key, text: opt.option_text }))
        }
      })
    }

    return NextResponse.json(roll)
  } catch (error) {
    console.error('Error in POST /api/game/[code]/roll:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
