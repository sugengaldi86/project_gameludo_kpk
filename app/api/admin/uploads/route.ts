import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { supabaseServer } from '@/lib/supabase'

const MAX_FILE_SIZE = 3 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'File gambar wajib dipilih' }, { status: 400 })
    const extension = ALLOWED_TYPES.get(file.type)
    if (!extension) return NextResponse.json({ error: 'Gunakan gambar JPG, PNG, atau WebP' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Ukuran gambar maksimal 3 MB' }, { status: 400 })

    const path = `essay-feedback/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`
    const supabase = supabaseServer()
    const { error } = await supabase.storage.from('learning-images').upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data } = supabase.storage.from('learning-images').getPublicUrl(path)
    return NextResponse.json({ data: { url: data.publicUrl, path } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gambar gagal diunggah' }, { status: 500 })
  }
}
