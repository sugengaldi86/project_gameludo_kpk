import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'
import { validateQuestionInput } from '@/lib/question-validation'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const { data, error } = await supabaseServer()
      .from('questions')
      .select('*,question_options(*),question_solutions(*)')
      .eq('id', id)
      .eq('question_type', 'multiple_choice')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to load admin question:', error)
    return NextResponse.json({ error: 'Database tidak dapat dihubungi' }, { status: 503 })
  }
}

export async function PUT(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Format data soal tidak valid' }, { status: 400 })
  }
  const validation = validateQuestionInput(body)
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 })

  const { question_options, question_solutions, ...question } = validation.data
  try {
    const supabase = supabaseServer()
    const { data: updated, error: questionError } = await supabase.rpc('save_admin_question', {
      p_question_id: id,
      p_question: question,
      p_options: question_options,
      p_solutions: question_solutions,
    })

    if (questionError) {
      const duplicate = questionError.code === '23505'
      return NextResponse.json({ error: duplicate ? 'Kode soal sudah digunakan' : questionError.message }, { status: duplicate ? 409 : 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Failed to update admin question:', error)
    return NextResponse.json({ error: 'Database tidak dapat dihubungi' }, { status: 503 })
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const supabase = supabaseServer()
    const { count, error: countError } = await supabase
      .from('player_answers')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', id)

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

    if ((count || 0) > 0) {
      const { data, error } = await supabase.from('questions').update({ is_active: false }).eq('id', id).eq('question_type', 'multiple_choice').select('id').maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 })
      return NextResponse.json({ success: true, mode: 'deactivated' })
    }

    const { data, error } = await supabase.from('questions').delete().eq('id', id).eq('question_type', 'multiple_choice').select('id').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ success: true, mode: 'deleted' })
  } catch (error) {
    console.error('Failed to delete admin question:', error)
    return NextResponse.json({ error: 'Database tidak dapat dihubungi' }, { status: 503 })
  }
}
