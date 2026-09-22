import 'server-only'
import { supabaseServer } from '@/lib/supabase'

export async function enforceGameDeadline(roomId: string) {
  const supabase = supabaseServer()
  const { data, error } = await supabase.from('game_sessions').select('exam_deadline_at,rooms!inner(end_time,status)').eq('room_id', roomId).single()
  if (error || !data) return { expired: false, error: error?.message }
  const relation = Array.isArray(data.rooms) ? data.rooms[0] : data.rooms
  const deadline = data.exam_deadline_at || relation?.end_time
  if (relation?.status !== 'playing') return { expired: true, error: 'Permainan sudah tidak aktif' }
  if (deadline && new Date(deadline).getTime() <= Date.now()) {
    const result = await supabase.rpc('finalize_expired_game', { p_room_id: roomId })
    return { expired: true, error: result.error?.message || 'Waktu ujian telah habis' }
  }
  return { expired: false, deadline }
}
