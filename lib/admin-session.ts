import 'server-only'

import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'
import { getAdminAuth } from '@/lib/firebase-admin'
import { supabaseServer } from '@/lib/supabase'

export type AdminSession = {
  id: string
  firebaseUid: string
  email: string
  name: string
  role: string
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  if (!sessionCookie) return null

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true)
    const { data, error } = await supabaseServer()
      .from('admins')
      .select('id, firebase_uid, email, name, role')
      .eq('firebase_uid', decoded.uid)
      .single()

    if (error || !data || !['admin', 'super_admin'].includes(data.role)) return null

    return {
      id: data.id,
      firebaseUid: data.firebase_uid,
      email: data.email,
      name: data.name,
      role: data.role,
    }
  } catch {
    return null
  }
}
