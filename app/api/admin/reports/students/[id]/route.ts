import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ id: string }> }

function percent(correct: number | null | undefined, total: number | null | undefined) {
  return total ? Math.round(((correct || 0) / total) * 100) : 0
}

export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = supabaseServer()
  const [profileResult, progressResult, answersResult, roomsResult] = await Promise.all([
    supabase.from('profiles').select('id,name,avatar,total_xp,level,total_score,created_at').eq('id', id).single(),
    supabase.from('learning_progress').select('*').eq('player_id', id).maybeSingle(),
    supabase.from('player_answers').select('game_session_id,is_correct,score_awarded,xp_awarded,answered_at').eq('player_id', id).order('answered_at', { ascending: false }),
    supabase.from('room_players').select('room_id,score,xp_earned,correct_answers,wrong_answers,joined_at,rooms(room_code)').eq('player_id', id).order('joined_at', { ascending: false }),
  ])

  if (profileResult.error || !profileResult.data) return NextResponse.json({ error: 'Murid tidak ditemukan' }, { status: 404 })
  if (progressResult.error || answersResult.error || roomsResult.error) return NextResponse.json({ error: progressResult.error?.message || answersResult.error?.message || roomsResult.error?.message }, { status: 500 })

  const answers = answersResult.data || []
  const correct = answers.filter((answer) => answer.is_correct).length
  const progress = progressResult.data
  return NextResponse.json({ data: {
    profile: profileResult.data,
    totals: { sessions: new Set(answers.map((answer) => answer.game_session_id)).size, answers: answers.length, correct, incorrect: answers.length - correct, accuracy: percent(correct, answers.length) },
    indicators: { pretest: Number(progress?.pretest_score || 0), information: percent(progress?.identify_known_correct, progress?.identify_known_total), strategy: percent(progress?.strategy_correct, progress?.strategy_total), kpk: percent(progress?.kpk_correct, progress?.kpk_total), verification: percent(progress?.verification_correct, progress?.verification_total) },
    rooms: roomsResult.data || [],
  } })
}
