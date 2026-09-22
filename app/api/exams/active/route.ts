import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
export async function GET() {
  const nowDate = new Date()
  const now = nowDate.toISOString()
  const { data, error } = await supabaseServer().from('exams')
    .select('id,name,learning_goal,starts_at,ends_at,duration_minutes,question_time_seconds,status')
    .in('status', ['scheduled','active']).gt('ends_at', now).order('starts_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const exams = (data || []).map(exam => {
    const startsAt = new Date(exam.starts_at)
    const availability = startsAt > nowDate ? 'upcoming' : 'available'
    return { ...exam, availability, is_available: availability === 'available' }
  })
  return NextResponse.json({ data: exams, serverTime: now }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
