import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'
type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params; const body = await request.json()
  const allowed = ['name','learning_goal','starts_at','ends_at','duration_minutes','question_time_seconds','question_count','difficulty','randomize_questions','randomize_options','late_tolerance_minutes','auto_submit','allow_resume','allow_rejoin','max_attempts','status']
  const changes = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  if ('starts_at' in changes || 'ends_at' in changes) {
    const startsAt = new Date(String(changes.starts_at || ''))
    const endsAt = new Date(String(changes.ends_at || ''))
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: 'Waktu mulai dan waktu selesai wajib diisi dengan benar.' }, { status: 400 })
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: 'Waktu selesai harus lebih akhir daripada waktu mulai.' }, { status: 400 })
    }
  }
  if ('duration_minutes' in changes) {
    const duration = Number(changes.duration_minutes)
    if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
      return NextResponse.json({ error: 'Durasi ujian harus antara 1 sampai 480 menit.' }, { status: 400 })
    }
  }
  const { data, error } = await supabaseServer().from('exams').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) {
    const schemaMismatch = error.message.includes('schema cache') || error.message.includes("'difficulty' column")
    const invalidSchedule = error.message.includes('exams_schedule_check')
    return NextResponse.json({
      error: schemaMismatch
        ? 'Skema database ujian belum terbaru. Jalankan migrasi 20260930_repair_exams_schema.sql di Supabase.'
        : invalidSchedule
          ? 'Waktu selesai harus lebih akhir daripada waktu mulai.'
        : error.message,
    }, { status: schemaMismatch ? 503 : 400 })
  }

  if (body.status === 'finished' || body.status === 'cancelled') {
    const supabase = supabaseServer()
    const { data: rooms } = await supabase.from('rooms').select('id').eq('exam_id', id).eq('status', 'playing')
    await Promise.all((rooms || []).map(async room => {
      await Promise.all([
        supabase.from('rooms').update({ status: body.status === 'finished' ? 'finished' : 'abandoned', finished_at: new Date().toISOString() }).eq('id', room.id),
        supabase.from('game_sessions').update({ status: body.status === 'finished' ? 'GAME_OVER' : 'ABANDONED', submitted_at: new Date().toISOString(), finished_at: new Date().toISOString() }).eq('room_id', room.id),
      ])
    }))
  }

  if (Array.isArray(body.selected_questions)) {
    await supabaseServer().from('exam_questions').delete().eq('exam_id', id)
    if (body.selected_questions.length > 0) {
      const questionMappings = body.selected_questions.map((qid: string) => ({
        exam_id: id,
        question_id: qid
      }))
      await supabaseServer().from('exam_questions').insert(questionMappings)
    }
  }

  return NextResponse.json({ data })
}
export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { count } = await supabaseServer().from('rooms').select('*', { head: true, count: 'exact' }).eq('exam_id', id)
  if (count) return NextResponse.json({ error: 'Ujian yang sudah memiliki peserta tidak dapat dihapus. Batalkan ujian sebagai gantinya.' }, { status: 409 })
  const { error } = await supabaseServer().from('exams').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
