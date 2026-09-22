import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { GUEST_ROOM_COOKIE } from '@/lib/auth-constants'
import { supabaseServer } from '@/lib/supabase'

export type GuestRoomSession = {
  roomId: string
  roomCode: string
}

export function hashGuestToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function getGuestRoomSession(roomCode: string): Promise<GuestRoomSession | null> {
  const token = (await cookies()).get(GUEST_ROOM_COOKIE)?.value
  if (!token || token.length < 32) return null

  const tokenHash = hashGuestToken(token)
  const { data, error } = await supabaseServer()
    .from('guest_room_sessions')
    .select('token_hash,expires_at,rooms!inner(id,room_code)')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !data) return null
  const storedHash = Buffer.from(data.token_hash, 'utf8')
  const suppliedHash = Buffer.from(tokenHash, 'utf8')
  if (storedHash.length !== suppliedHash.length || !timingSafeEqual(storedHash, suppliedHash)) return null

  const relation = Array.isArray(data.rooms) ? data.rooms[0] : data.rooms
  if (!relation || relation.room_code.toUpperCase() !== roomCode.toUpperCase()) return null
  return { roomId: relation.id, roomCode: relation.room_code }
}
