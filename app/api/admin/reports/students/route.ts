import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import type { StudentReport } from '@/lib/admin-types'
import { supabaseServer } from '@/lib/supabase'

function accuracy(correct: number | null | undefined, total: number | null | undefined) {
  return total ? Math.round(((correct || 0) / total) * 100) : 0
}

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const scopedReport = Boolean(roomId || from || to)
  const supabase = supabaseServer()

  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id,room_code').order('created_at', { ascending: false })
  if (roomsError) return NextResponse.json({ error: roomsError.message }, { status: 500 })

  let allowedPlayerIds: string[] | null = null
  let allowedSessionIds: string[] | null = null

  if (roomId) {
    const [{ data: roomPlayers, error: playersError }, { data: sessions, error: sessionsError }] = await Promise.all([
      supabase.from('room_players').select('player_id').eq('room_id', roomId),
      supabase.from('game_sessions').select('id').eq('room_id', roomId),
    ])
    if (playersError || sessionsError) return NextResponse.json({ error: playersError?.message || sessionsError?.message }, { status: 500 })
    allowedPlayerIds = [...new Set((roomPlayers || []).map((row) => row.player_id))]
    allowedSessionIds = (sessions || []).map((row) => row.id)
  }

  if (allowedPlayerIds?.length === 0) {
    return NextResponse.json({ data: [], rooms: rooms || [], summary: { students: 0, answers: 0, averageAccuracy: 0, belowTarget: 0 } })
  }

  let profilesQuery = supabase.from('profiles').select('id,name')
  if (allowedPlayerIds) profilesQuery = profilesQuery.in('id', allowedPlayerIds)

  let answersQuery = supabase.from('player_answers').select('player_id,game_session_id,is_correct,identify_known_correct,strategy_correct,verification_correct,answered_at')
  if (allowedPlayerIds) answersQuery = answersQuery.in('player_id', allowedPlayerIds)
  if (allowedSessionIds) {
    if (allowedSessionIds.length === 0) {
      return NextResponse.json({ data: [], rooms: rooms || [], summary: { students: 0, answers: 0, averageAccuracy: 0, belowTarget: 0 } })
    }
    answersQuery = answersQuery.in('game_session_id', allowedSessionIds)
  }
  if (from) answersQuery = answersQuery.gte('answered_at', `${from}T00:00:00.000Z`)
  if (to) answersQuery = answersQuery.lte('answered_at', `${to}T23:59:59.999Z`)

  const [{ data: profiles, error: profilesError }, { data: answers, error: answersError }] = await Promise.all([profilesQuery, answersQuery])
  if (profilesError || answersError) return NextResponse.json({ error: profilesError?.message || answersError?.message }, { status: 500 })

  const playerIds = (profiles || []).map((profile) => profile.id)
  let progress: Array<Record<string, number | string | null>> = []
  if (playerIds.length) {
    const progressResult = await supabase.from('learning_progress').select('*').in('player_id', playerIds)
    if (progressResult.error) return NextResponse.json({ error: progressResult.error.message }, { status: 500 })
    progress = progressResult.data || []
  }

  const reportProfiles = (profiles || []).filter((profile) => !scopedReport || (answers || []).some((answer) => answer.player_id === profile.id))
  const reports: StudentReport[] = reportProfiles.map((profile) => {
    const playerAnswers = (answers || []).filter((answer) => answer.player_id === profile.id)
    const correctCount = playerAnswers.filter((answer) => answer.is_correct).length
    const studentProgress = progress.find((row) => row.player_id === profile.id)
    const knownAnswers = playerAnswers.filter((answer) => answer.identify_known_correct !== null)
    const strategyAnswers = playerAnswers.filter((answer) => answer.strategy_correct !== null)
    const verificationAnswers = playerAnswers.filter((answer) => answer.verification_correct !== null)
    const sessionCount = new Set(playerAnswers.map((answer) => answer.game_session_id)).size
    const latestActivity = playerAnswers.reduce<string | null>((latest, answer) => !latest || answer.answered_at > latest ? answer.answered_at : latest, null)

    return {
      playerId: profile.id,
      name: profile.name,
      sessionCount,
      questionCount: playerAnswers.length,
      correctCount,
      incorrectCount: playerAnswers.length - correctCount,
      accuracy: accuracy(correctCount, playerAnswers.length),
      pretestScore: Number(studentProgress?.pretest_score || 0),
      informationAccuracy: scopedReport
        ? accuracy(knownAnswers.filter((answer) => answer.identify_known_correct).length, knownAnswers.length)
        : accuracy(Number(studentProgress?.identify_known_correct || 0), Number(studentProgress?.identify_known_total || 0)),
      strategyAccuracy: scopedReport
        ? accuracy(strategyAnswers.filter((answer) => answer.strategy_correct).length, strategyAnswers.length)
        : accuracy(Number(studentProgress?.strategy_correct || 0), Number(studentProgress?.strategy_total || 0)),
      kpkAccuracy: scopedReport
        ? accuracy(correctCount, playerAnswers.length)
        : accuracy(Number(studentProgress?.kpk_correct || 0), Number(studentProgress?.kpk_total || 0)),
      verificationAccuracy: scopedReport
        ? accuracy(verificationAnswers.filter((answer) => answer.verification_correct).length, verificationAnswers.length)
        : accuracy(Number(studentProgress?.verification_correct || 0), Number(studentProgress?.verification_total || 0)),
      latestActivity,
    }
  })

  const totalAnswers = reports.reduce((sum, report) => sum + report.questionCount, 0)
  const totalCorrect = reports.reduce((sum, report) => sum + report.correctCount, 0)
  return NextResponse.json({
    data: reports,
    rooms: rooms || [],
    summary: {
      students: reports.length,
      answers: totalAnswers,
      averageAccuracy: accuracy(totalCorrect, totalAnswers),
      belowTarget: reports.filter((report) => report.questionCount > 0 && report.accuracy < 75).length,
    },
  })
}
