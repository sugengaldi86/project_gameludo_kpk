import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'

async function authorized() { return Boolean(await getAdminSession()) }

function missingColumn(error: { code?: string; message?: string } | null, column: string) {
  return Boolean(error && ['PGRST204', '42703'].includes(error.code || '') && error.message?.includes(column))
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = supabaseServer()
  const [contents, essayResult] = await Promise.all([
    supabase.from('learning_contents').select('*').order('content_type').order('display_order'),
    supabase.from('questions').select('id,question_code,story,answer_know,answer_asked,answer_plan,answer_solution,answer_check,score_weight,display_order,is_active,difficulty,operand_count,context_type').eq('question_type', 'essay').order('display_order'),
  ])
  let essayError = essayResult.error
  let essayData = essayResult.data

  // answer_plan ditambahkan pada migrasi Polya. Tetap izinkan bank soal lama
  // dibuka sambil menunggu migrasi tersebut diterapkan ke database.
  if (missingColumn(essayResult.error, 'answer_plan')) {
    const legacyResult = await supabase.from('questions').select('id,question_code,story,answer_know,answer_asked,strategy,answer_solution,answer_check,score_weight,display_order,is_active,difficulty').eq('question_type', 'essay').order('display_order')
    essayError = legacyResult.error
    essayData = legacyResult.data?.map(item => ({ ...item, answer_plan: item.strategy || '' })) || null
  }

  const error = contents.error || essayError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { contents: contents.data || [], essays: essayData || [] } })
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = supabaseServer()
  if (body.entity === 'content') {
    if (!['objective','material'].includes(body.content_type) || !String(body.title || '').trim() || !String(body.body || '').trim()) return NextResponse.json({ error: 'Jenis, judul, dan isi wajib diisi' }, { status: 400 })
    const payload = { content_type: body.content_type, title: String(body.title).trim(), body: String(body.body).trim(), image_url: body.image_url ? String(body.image_url).trim() : null, display_order: Number(body.display_order) || 0, show_in_briefing: body.content_type === 'material' && body.show_in_briefing !== false, is_active: body.is_active !== false, updated_at: new Date().toISOString() }
    const result = body.id ? await supabase.from('learning_contents').update(payload).eq('id', body.id).select().single() : await supabase.from('learning_contents').insert(payload).select().single()
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ data: result.data }, { status: body.id ? 200 : 201 })
  }
  if (body.entity === 'essay') {
    if (!String(body.question_code || '').trim() || !String(body.story || '').trim()) return NextResponse.json({ error: 'Kode dan teks soal wajib diisi' }, { status: 400 })
    const payload = { question_code: String(body.question_code).trim().toUpperCase(), story: String(body.story).trim(), question_type: 'essay', difficulty: ['mudah','sedang','hots'].includes(body.difficulty) ? body.difficulty : 'sedang', topic: 'kpk', known_information: body.answer_know || '', asked_information: body.answer_asked || '', strategy: body.answer_plan || 'KPK', number_a: 1, number_b: 1, operand_count: Math.min(3, Math.max(2, Number(body.operand_count) || 2)), context_type: 'kontekstual', correct_value: 1, correct_option: 'A', final_explanation: body.answer_check || '', answer_know: body.answer_know || '', answer_asked: body.answer_asked || '', answer_plan: body.answer_plan || '', answer_solution: body.answer_solution || '', answer_check: body.answer_check || '', score_weight: 10, display_order: Number(body.display_order) || 0, is_active: body.is_active !== false }
    let result = body.id ? await supabase.from('questions').update(payload).eq('id', body.id).select().single() : await supabase.from('questions').insert(payload).select().single()
    if (missingColumn(result.error, 'answer_plan')) {
      const { answer_plan: _answerPlan, ...legacyPayload } = payload
      void _answerPlan
      result = body.id ? await supabase.from('questions').update(legacyPayload).eq('id', body.id).select().single() : await supabase.from('questions').insert(legacyPayload).select().single()
    }
    if (result.error) return NextResponse.json({ error: result.error.code === '23505' ? 'Kode soal sudah digunakan' : result.error.message }, { status: result.error.code === '23505' ? 409 : 500 })
    return NextResponse.json({ data: result.data }, { status: body.id ? 200 : 201 })
  }
  return NextResponse.json({ error: 'Jenis data tidak valid' }, { status: 400 })
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')
  const id = searchParams.get('id')
  if (!id || !['content','essay'].includes(entity || '')) return NextResponse.json({ error: 'Target tidak valid' }, { status: 400 })
  const table = entity === 'content' ? 'learning_contents' : 'questions'
  const { error } = await supabaseServer().from(table).update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
