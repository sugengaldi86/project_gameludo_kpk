import { NextResponse } from 'next/server'
import { GUEST_ROOM_COOKIE } from '@/lib/auth-constants'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { players, goal, examId } = await request.json()

    if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
      return NextResponse.json({ error: 'Data pemain tidak valid' }, { status: 400 })
    }
    const normalizedPlayers = players.map((player: unknown) => {
      const value = player as Record<string, unknown>
      return {
        studentCode: String(value.studentCode || '').trim().toUpperCase(),
        name: String(value.name || '').trim(),
        avatar: String(value.avatar || '').slice(0, 1),
        color: String(value.color || ''),
      }
    })
    if (new Set(normalizedPlayers.map((player: { color: string }) => player.color)).size !== normalizedPlayers.length) {
      return NextResponse.json({ error: 'Setiap pemain harus memiliki warna berbeda' }, { status: 400 })
    }
    if (normalizedPlayers.some((player) => !/^[A-Z0-9_-]{3,30}$/.test(player.studentCode))) {
      return NextResponse.json({ error: 'Kode siswa wajib diisi dan harus terdiri dari 3-30 karakter' }, { status: 400 })
    }
    if (new Set(normalizedPlayers.map((player) => player.studentCode)).size !== normalizedPlayers.length) {
      return NextResponse.json({ error: 'Kode siswa harus berbeda untuk setiap pemain' }, { status: 400 })
    }

    const supabase = supabaseServer()
    const { data, error } = await supabase.rpc('create_local_game', {
      p_players: normalizedPlayers,
      p_learning_goal: typeof goal === 'string' ? goal.slice(0, 200) : null,
      p_game_mode: 'klasik',
      p_exam_id: typeof examId === 'string' && examId ? examId : null,
    })
    if (error || !data) {
      const validationError = error?.message?.includes('Nama pemain')
        || error?.message?.includes('Warna pemain')
        || error?.message?.includes('Kode siswa')
      const missingStudentCode = error?.message?.includes('student_code')
        && (error.message.includes('does not exist') || error.message.includes('schema cache'))
      return NextResponse.json({
        error: missingStudentCode
          ? 'Skema profil siswa belum terbaru. Jalankan migrasi 20261001_repair_profile_student_code.sql di Supabase.'
          : error?.message || 'Room gagal dibuat',
      }, { status: validationError ? 400 : missingStudentCode ? 503 : 500 })
    }

    const result = data as {
      roomCode: string
      roomId: string
      sessionId: string
      accessToken: string
      players: unknown[]
    }
    const response = NextResponse.json({
      success: true,
      roomCode: result.roomCode,
      roomId: result.roomId,
      sessionId: result.sessionId,
      players: result.players,
    })
    response.cookies.set(GUEST_ROOM_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
      priority: 'high',
    })
    return response

  } catch (error: unknown) {
    console.error('Error in POST /api/rooms/local:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
