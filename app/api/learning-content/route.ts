import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET() {
  const supabase = supabaseServer()
  const result = await supabase
    .from('learning_contents')
    .select('id,content_type,title,body,image_url,display_order,show_in_briefing')
    .eq('is_active', true)
    .order('display_order')
  let data = result.data
  let error = result.error
  if (error && ['PGRST204', '42703'].includes(error.code || '') && error.message.includes('show_in_briefing')) {
    const legacyResult = await supabase
      .from('learning_contents')
      .select('id,content_type,title,body,image_url,display_order')
      .eq('is_active', true)
      .order('display_order')
    data = legacyResult.data?.map(item => ({ ...item, show_in_briefing: true })) || null
    error = legacyResult.error
  }
  if (error) return NextResponse.json({ error: `Konten pembelajaran gagal dimuat: ${error.message}` }, { status: 503 })
  const materials = (data || []).filter(item => item.content_type === 'material')
  return NextResponse.json({ data: {
    objectives: (data || []).filter(item => item.content_type === 'objective'),
    materials,
    briefingMaterials: materials.filter(item => item.show_in_briefing),
  } })
}
