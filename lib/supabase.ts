import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Client instance untuk dipakai di browser (hanya punya akses baca)
export const supabaseClient = createClient(supabaseUrl, supabasePublishableKey)

// Server instance untuk dipakai di API Routes (punya akses penuh / bypass RLS)
// PERINGATAN: Jangan pernah mengimpor supabaseServer di Client Component!
export const supabaseServer = () => {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Make sure to set it in .env.local')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
