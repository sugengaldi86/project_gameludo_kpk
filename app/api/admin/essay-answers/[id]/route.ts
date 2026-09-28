import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const scores = [body.knownScore, body.askedScore, body.planningScore, body.executionScore, body.reviewScore].map(Number)
  if (scores.some(score => !Number.isFinite(score) || score < 0)) return NextResponse.json({ error: 'Nilai setiap tahap tidak valid' }, { status: 400 })
  const [knownScore, askedScore, planningScore, executionScore, reviewScore] = scores
  if (knownScore > 1 || askedScore > 1 || planningScore > 2 || executionScore > 4 || reviewScore > 2) return NextResponse.json({ error: 'Nilai melebihi bobot rubrik 1 + 1 + 2 + 4 + 2' }, { status: 400 })
  const payload = {
    known_score: knownScore,
    asked_score: askedScore,
    understanding_score: knownScore + askedScore,
    planning_score: planningScore,
    execution_score: executionScore,
    review_score: reviewScore,
    manual_score: scores.reduce((total, score) => total + score, 0),
    reviewed_at: new Date().toISOString(),
  }
  const { data, error } = await supabaseServer().from('player_essay_answers').update(payload).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
