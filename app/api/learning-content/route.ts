import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseServer()
    .from('learning_contents')
    .select('id,content_type,title,body,image_url,display_order,show_in_briefing')
    .eq('is_active', true)
    .order('display_order')
  if (error) return NextResponse.json({ error: `Konten pembelajaran gagal dimuat: ${error.message}` }, { status: 503 })
  const materials = (data || []).filter(item => item.content_type === 'material')
  return NextResponse.json({ data: {
    objectives: (data || []).filter(item => item.content_type === 'objective'),
    materials,
    briefingMaterials: materials.filter(item => item.show_in_briefing),
  } })
}
