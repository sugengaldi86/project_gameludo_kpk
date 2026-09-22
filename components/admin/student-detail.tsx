'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpenCheck, Gamepad2, Sparkles, Target } from 'lucide-react'

type Detail = { profile: { name: string; total_xp: number; level: number; total_score: number }; totals: { sessions: number; answers: number; correct: number; incorrect: number; accuracy: number }; indicators: { pretest: number; information: number; strategy: number; kpk: number; verification: number }; rooms: Array<{ room_id: string; score: number; xp_earned: number; correct_answers: number; wrong_answers: number; joined_at: string; rooms: { room_code: string } | Array<{ room_code: string }> | null }> }

function Indicator({ label, value }: { label: string; value: number }) {
  return <div className="admin-indicator"><div><strong>{label}</strong><span className={value >= 75 ? 'achieved' : 'needs-work'}>{value}% {value >= 75 ? '✓' : '!'}</span></div><div className="admin-progress"><span className={value >= 75 ? 'achieved' : 'needs-work'} style={{ width: `${value}%` }} /></div></div>
}

export function StudentDetail({ studentId }: { studentId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { fetch(`/api/admin/reports/students/${studentId}`).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal memuat detail murid'); setDetail(result.data) }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Gagal memuat detail murid')) }, [studentId])

  if (error) return <div className="admin-alert error">{error}</div>
  if (!detail) return <section className="admin-panel admin-form-loading">Memuat detail murid...</section>

  return <><Link href="/admin/reports" className="admin-secondary-button admin-back-link"><ArrowLeft /> Kembali ke rekap</Link><section className="admin-student-hero"><div className="admin-avatar large">{detail.profile.name.charAt(0).toUpperCase()}</div><div><span className="admin-kicker">PROFIL MURID</span><h1>{detail.profile.name}</h1><p>Level {detail.profile.level} · {detail.profile.total_xp} XP · {detail.profile.total_score} total poin</p></div></section><section className="admin-metric-grid student-metrics"><article className="admin-metric blue"><div className="admin-metric-icon"><Gamepad2 /></div><div><span>Sesi Dimainkan</span><strong>{detail.totals.sessions}</strong></div></article><article className="admin-metric green"><div className="admin-metric-icon"><BookOpenCheck /></div><div><span>Soal Dijawab</span><strong>{detail.totals.answers}</strong></div></article><article className="admin-metric amber"><div className="admin-metric-icon"><Target /></div><div><span>Akurasi</span><strong>{detail.totals.accuracy}%</strong></div></article></section><section className="admin-dashboard-grid student-detail-grid"><article className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">TUJUAN PEMBELAJARAN</span><h2>Ketercapaian indikator</h2></div><Sparkles /></div><div className="admin-indicator-list"><Indicator label="Pretest prasyarat" value={detail.indicators.pretest} /><Indicator label="Memahami informasi" value={detail.indicators.information} /><Indicator label="Menentukan strategi" value={detail.indicators.strategy} /><Indicator label="Menghitung KPK" value={detail.indicators.kpk} /><Indicator label="Memeriksa jawaban" value={detail.indicators.verification} /></div></article><article className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">RIWAYAT</span><h2>Sesi terbaru</h2></div></div><div className="admin-session-list">{detail.rooms.length === 0 ? <p>Belum ada sesi permainan.</p> : detail.rooms.slice(0,8).map((room) => { const relation = Array.isArray(room.rooms) ? room.rooms[0] : room.rooms; return <div key={`${room.room_id}-${room.joined_at}`}><span><strong>{relation?.room_code || 'Room'}</strong><small>{new Date(room.joined_at).toLocaleDateString('id-ID')}</small></span><span><strong>{room.score} poin</strong><small>{room.correct_answers} benar · {room.wrong_answers} belum tepat</small></span></div> })}</div></article></section></>
}
