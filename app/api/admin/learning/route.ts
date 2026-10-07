import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'

type DatabaseError = { code?: string; message?: string } | null
const ESSAY_CODE_PATTERN = /^(?:U[A-Z0-9-]{1,19}|ES\d{2,})$/

async function authorized() { return Boolean(await getAdminSession()) }
function missingColumn(error: DatabaseError, column: string) { return Boolean(error && ['PGRST204', '42703'].includes(error.code || '') && error.message?.includes(column)) }
function databaseUnavailable(error: unknown) {
  console.error('Admin learning database error:', error)
  return NextResponse.json({ error: 'Database tidak dapat dihubungi. Periksa konfigurasi Supabase.' }, { status: 503 })
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = supabaseServer()
    const [contents, essayResult] = await Promise.all([
      supabase.from('learning_contents').select('*').order('content_type').order('display_order'),
      supabase.from('questions').select('id,question_code,story,answer_know,answer_asked,answer_plan,answer_solution,answer_check,answer_know_image_url,answer_asked_image_url,answer_plan_image_url,answer_solution_image_url,answer_check_image_url,score_weight,display_order,is_active,difficulty,operand_count,context_type').eq('question_type', 'essay').order('display_order'),
    ])
    let essayError = essayResult.error
    let essayData = essayResult.data
    const missingEssayExtension = [
      'answer_plan',
      'answer_know_image_url',
      'answer_asked_image_url',
      'answer_plan_image_url',
      'answer_solution_image_url',
      'answer_check_image_url',
    ].some(column => missingColumn(essayResult.error, column))
    if (missingEssayExtension) {
      const legacyResult = await supabase.from('questions').select('id,question_code,story,answer_know,answer_asked,strategy,answer_solution,answer_check,score_weight,display_order,is_active,difficulty,operand_count,context_type').eq('question_type', 'essay').order('display_order')
      essayError = legacyResult.error
      essayData = legacyResult.data?.map(item => ({
        ...item,
        answer_plan: item.strategy || '',
        answer_know_image_url: null,
        answer_asked_image_url: null,
        answer_plan_image_url: null,
        answer_solution_image_url: null,
        answer_check_image_url: null,
      })) || null
    }
    const error = contents.error || essayError
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { contents: contents.data || [], essays: essayData || [] } })
  } catch (error) { return databaseUnavailable(error) }
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 }) }

  try {
    const supabase = supabaseServer()
    if (body.entity === 'content') {
      const title = String(body.title || '').trim()
      const contentBody = String(body.body || '').trim()
      if (!['objective', 'material'].includes(String(body.content_type)) || !title || !contentBody) return NextResponse.json({ error: 'Jenis, judul, dan isi wajib diisi' }, { status: 400 })
      const payload = {
        content_type: body.content_type, title, body: contentBody,
        image_url: body.image_url ? String(body.image_url).trim() : null,
        display_order: Number(body.display_order) || 0,
        show_in_briefing: body.content_type === 'material' && body.show_in_briefing !== false,
        is_active: body.is_active !== false, updated_at: new Date().toISOString(),
      }
      let result = body.id ? await supabase.from('learning_contents').update(payload).eq('id', String(body.id)).select().single() : await supabase.from('learning_contents').insert(payload).select().single()
      // Kompatibilitas sementara jika migration 20261009 belum diterapkan.
      if (missingColumn(result.error, 'show_in_briefing')) {
        const { show_in_briefing: _showInBriefing, ...legacyPayload } = payload
        void _showInBriefing
        result = body.id ? await supabase.from('learning_contents').update(legacyPayload).eq('id', String(body.id)).select().single() : await supabase.from('learning_contents').insert(legacyPayload).select().single()
      }
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
      return NextResponse.json({ data: result.data }, { status: body.id ? 200 : 201 })
    }

    if (body.entity === 'essay') {
      const questionCode = String(body.question_code || '').trim().toUpperCase()
      const story = String(body.story || '').trim()
      if (!ESSAY_CODE_PATTERN.test(questionCode)) return NextResponse.json({ error: 'Kode uraian harus menggunakan format U-KPK-01 atau ES01' }, { status: 400 })
      if (story.length < 20) return NextResponse.json({ error: 'Teks soal uraian minimal 20 karakter' }, { status: 400 })
      const difficulty = ['mudah', 'sedang', 'hots'].includes(String(body.difficulty)) ? String(body.difficulty) : 'sedang'
      const commonPayload = {
        question_code: questionCode, story, question_type: 'essay', difficulty, topic: 'kpk',
        known_information: String(body.answer_know || '').trim(), asked_information: String(body.answer_asked || '').trim(),
        strategy: String(body.answer_plan || '').trim() || 'KPK',
        operand_count: Math.min(3, Math.max(2, Number(body.operand_count) || 2)), context_type: 'kontekstual',
        final_explanation: String(body.answer_check || '').trim(),
        answer_know: String(body.answer_know || '').trim(), answer_asked: String(body.answer_asked || '').trim(),
        answer_plan: String(body.answer_plan || '').trim(), answer_solution: String(body.answer_solution || '').trim(),
        answer_check: String(body.answer_check || '').trim(),
        answer_know_image_url: body.answer_know_image_url ? String(body.answer_know_image_url).trim() : null,
        answer_asked_image_url: body.answer_asked_image_url ? String(body.answer_asked_image_url).trim() : null,
        answer_plan_image_url: body.answer_plan_image_url ? String(body.answer_plan_image_url).trim() : null,
        answer_solution_image_url: body.answer_solution_image_url ? String(body.answer_solution_image_url).trim() : null,
        answer_check_image_url: body.answer_check_image_url ? String(body.answer_check_image_url).trim() : null,
        score_weight: Math.max(1, Number(body.score_weight) || 10),
        display_order: Number(body.display_order) || 0, is_active: body.is_active !== false,
      }
      const payload = body.id ? commonPayload : {
        ...commonPayload,
        number_a: 1,
        number_b: 1,
        number_c: null,
        correct_value: 1,
        correct_option: 'A',
      }
      let result = body.id ? await supabase.from('questions').update(payload).eq('id', String(body.id)).eq('question_type', 'essay').select().single() : await supabase.from('questions').insert(payload).select().single()
      if (missingColumn(result.error, 'answer_plan')) {
        const { answer_plan: _answerPlan, ...legacyPayload } = payload
        void _answerPlan
        result = body.id ? await supabase.from('questions').update(legacyPayload).eq('id', String(body.id)).eq('question_type', 'essay').select().single() : await supabase.from('questions').insert(legacyPayload).select().single()
      }
      if (result.error) {
        const duplicate = result.error.code === '23505'
        return NextResponse.json({ error: duplicate ? 'Kode soal sudah digunakan' : result.error.message }, { status: duplicate ? 409 : 500 })
      }
      return NextResponse.json({ data: result.data }, { status: body.id ? 200 : 201 })
    }
    return NextResponse.json({ error: 'Jenis data tidak valid' }, { status: 400 })
  } catch (error) { return databaseUnavailable(error) }
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')
  const id = searchParams.get('id')
  if (!id || !['content', 'essay'].includes(entity || '')) return NextResponse.json({ error: 'Target tidak valid' }, { status: 400 })
  try {
    const table = entity === 'content' ? 'learning_contents' : 'questions'
    let query = supabaseServer().from(table).update({ is_active: false }).eq('id', id)
    if (entity === 'essay') query = query.eq('question_type', 'essay')
    const { data, error } = await query.select('id').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) { return databaseUnavailable(error) }
}
