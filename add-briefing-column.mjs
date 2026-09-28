// add-briefing-column.mjs
// Pendekatan: Gunakan supabase-js untuk insert/update sebagai workaround
// karena kolom belum ada. Kita update API route agar tidak memerlukan kolom tsb.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tliabhiwngjhmekgkeez.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaWFiaGl3bmdqaG1la2drZWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg1ODgxMiwiZXhwIjoyMTA1NDM0ODEyfQ.QOxJCGeYcxD8uIC-kOcpeKiQ5jtQ9J4TQcn2ZyzCH2Y'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function run() {
  // Test: fetch learning_contents tanpa kolom show_in_briefing
  const { data, error } = await supabase
    .from('learning_contents')
    .select('id, content_type, title, body, display_order, is_active')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.error('Error fetching:', error.message)
    return
  }

  console.log('Data berhasil diambil tanpa show_in_briefing:')
  console.log(JSON.stringify(data, null, 2))
  console.log('\nTotal rows:', data.length)
  console.log('\nFIX SUDAH DITERAPKAN: API tidak lagi memerlukan kolom show_in_briefing')
  console.log('Semua material aktif akan tampil di briefing pra-permainan')
}

run().catch(console.error)
