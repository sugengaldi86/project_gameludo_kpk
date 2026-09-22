import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'
import { validateQuestionInput } from '@/lib/question-validation'

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const difficulty = searchParams.get('difficulty') || ''
  const status = searchParams.get('status') || ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize')) || 10))
  const from = (page - 1) * pageSize

  let query = supabaseServer()
    .from('questions')
    .select('*,question_options(*),question_solutions(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  const safeSearch = search.replace(/[,%()]/g, ' ')
  if (safeSearch) query = query.or(`question_code.ilike.%${safeSearch}%,story.ilike.%${safeSearch}%`)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data || [],
    pagination: { page, pageSize, total: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)) },
  })
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const validation = validateQuestionInput(await request.json())
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 })

  const { question_options, question_solutions, ...question } = validation.data
  const supabase = supabaseServer()
  const { data: created, error: questionError } = await supabase.rpc('save_admin_question', {
    p_question_id: null,
    p_question: question,
    p_options: question_options,
    p_solutions: question_solutions,
  })

  if (questionError) {
    const duplicate = questionError.code === '23505'
    return NextResponse.json({ error: duplicate ? 'Kode soal sudah digunakan' : questionError.message }, { status: duplicate ? 409 : 500 })
  }

  return NextResponse.json({ data: created }, { status: 201 })
}
