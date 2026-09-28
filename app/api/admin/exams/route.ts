import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'

const statuses = ['draft', 'scheduled', 'active', 'finished', 'cancelled']
function normalize(body: Record<string, unknown>) {
  return {
    name: String(body.name || '').trim(), learning_goal: String(body.learning_goal || '').trim() || null,
    starts_at: String(body.starts_at || ''), ends_at: String(body.ends_at || ''),
    duration_minutes: Number(body.duration_minutes), question_time_seconds: body.question_time_seconds ? Number(body.question_time_seconds) : null,
    question_count: body.question_count ? Number(body.question_count) : null, difficulty: String(body.difficulty || '') || null,
    essay_question_count: Math.max(0, Number(body.essay_question_count ?? 5)),
    multiple_choice_question_count: Math.max(0, Number(body.multiple_choice_question_count ?? 10)),
    feedback_timing: body.feedback_timing === 'immediate' ? 'immediate' : 'end',
    show_provisional_ranking: body.show_provisional_ranking !== false,
    passing_score: Math.min(100, Math.max(0, Number(body.passing_score ?? 75))),
    essay_weight: Math.min(100, Math.max(0, Number(body.essay_weight ?? 50))),
    multiple_choice_weight: Math.min(100, Math.max(0, Number(body.multiple_choice_weight ?? 50))),
    participant_mode: body.participant_mode === 'individual' ? 'individual' : 'group',
    randomize_questions: body.randomize_questions !== false, randomize_options: body.randomize_options === true,
    late_tolerance_minutes: Number(body.late_tolerance_minutes || 0), auto_submit: body.auto_submit !== false,
    allow_resume: body.allow_resume !== false, allow_rejoin: body.allow_rejoin !== false,
    max_attempts: Number(body.max_attempts || 1), status: String(body.status || 'draft'), updated_at: new Date().toISOString(),
  }
}
function validate(data: ReturnType<typeof normalize>) {
  if (data.name.length < 3) return 'Nama ujian minimal 3 karakter'
  if (!data.starts_at || !data.ends_at || new Date(data.ends_at) <= new Date(data.starts_at)) return 'Jadwal ujian tidak valid'
  if (!Number.isInteger(data.duration_minutes) || data.duration_minutes < 1 || data.duration_minutes > 480) return 'Durasi ujian harus 1-480 menit'
  if (data.question_time_seconds !== null && data.question_time_seconds < 10) return 'Waktu per soal minimal 10 detik'
  if (!Number.isInteger(data.essay_question_count) || !Number.isInteger(data.multiple_choice_question_count) || data.essay_question_count + data.multiple_choice_question_count < 1) return 'Jumlah soal uraian dan pilihan ganda tidak valid'
  if (data.essay_weight + data.multiple_choice_weight !== 100) return 'Total bobot uraian dan pilihan ganda harus 100%'
  if (!statuses.includes(data.status)) return 'Status ujian tidak valid'
  return null
}
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseServer().from('exams').select('*,rooms(id,status),exam_questions(question_id)').order('starts_at', { ascending: false })
  if (error) {
    const schemaMismatch = error.message.includes('schema cache') || error.message.includes("'difficulty' column")
    return NextResponse.json({
      error: schemaMismatch
        ? 'Skema database ujian belum terbaru. Jalankan migrasi 20260930_repair_exams_schema.sql di Supabase.'
        : error.message,
    }, { status: schemaMismatch ? 503 : 500 })
  }
  const exams = (data || []).map(exam => ({
    ...exam,
    selected_questions: exam.exam_questions
      ? (exam.exam_questions as Array<{ question_id: string }>).map(eq => eq.question_id)
      : []
  }))
  return NextResponse.json({ data: exams })
}
export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rawBody = await request.json()
  const payload = normalize(rawBody); const invalid = validate(payload)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
  const { data, error } = await supabaseServer().from('exams').insert(payload).select().single()
  if (error) {
    const schemaMismatch = error.message.includes('schema cache') || error.message.includes("'difficulty' column")
    return NextResponse.json({
      error: schemaMismatch
        ? 'Skema database ujian belum terbaru. Jalankan migrasi 20260930_repair_exams_schema.sql di Supabase.'
        : error.message,
    }, { status: schemaMismatch ? 503 : 500 })
  }
  
  if (Array.isArray(rawBody.selected_questions) && rawBody.selected_questions.length > 0) {
    const questionMappings = rawBody.selected_questions.map((qid: string, index: number) => ({
      exam_id: data.id,
      question_id: qid,
      position: index + 1,
    }))
    await supabaseServer().from('exam_questions').insert(questionMappings)
  }

  return NextResponse.json({ data }, { status: 201 })
}
