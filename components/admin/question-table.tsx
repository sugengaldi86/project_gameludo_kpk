'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2 } from 'lucide-react'
import type { AdminQuestion } from '@/lib/admin-types'

type Pagination = { page: number; pageSize: number; total: number; totalPages: number }

export function QuestionTable() {
  const searchParams = useSearchParams()
  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState(() => searchParams.get('difficulty') ?? '')
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null)

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: '10' })
    if (search) params.set('search', search)
    if (difficulty) params.set('difficulty', difficulty)
    if (status) params.set('status', status)
    try {
      const response = await fetch(`/api/admin/questions?${params}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Gagal memuat soal')
      setQuestions(result.data)
      setPagination(result.pagination)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat soal')
    } finally {
      setLoading(false)
    }
  }, [page, search, difficulty, status])

  useEffect(() => {
    const timer = window.setTimeout(loadQuestions, 250)
    return () => window.clearTimeout(timer)
  }, [loadQuestions])

  async function removeQuestion() {
    if (!deleteTarget) return
    const response = await fetch(`/api/admin/questions/${deleteTarget.id}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Gagal menghapus soal')
    } else {
      setDeleteTarget(null)
      await loadQuestions()
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Cari kode atau cerita soal..." /></div>
        <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1) }} aria-label="Filter kesulitan">
          <option value="">Semua kesulitan</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="kontekstual">Kontekstual</option><option value="tiga_bilangan">Tiga bilangan</option>
        </select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Filter status">
          <option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option>
        </select>
        <Link href="/admin/questions/new" className="admin-primary-button"><Plus /> Tambah Soal</Link>
      </div>
      {error && <div className="admin-alert error">{error}</div>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Kode</th><th>Cerita soal</th><th>Kesulitan</th><th>Jawaban</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="admin-empty">Memuat bank soal...</td></tr> : questions.length === 0 ? <tr><td colSpan={6} className="admin-empty">Belum ada soal yang sesuai filter.</td></tr> : questions.map((question) => (
              <tr key={question.id}>
                <td><strong className="admin-code">{question.question_code}</strong></td>
                <td><div className="admin-story-cell"><strong>{question.story}</strong><span>{question.number_a}, {question.number_b}{question.number_c ? `, ${question.number_c}` : ''}</span></div></td>
                <td><span className={`admin-badge difficulty-${question.difficulty}`}>{question.difficulty.replace('_', ' ')}</span></td>
                <td><strong>{question.correct_value}</strong> <small>({question.correct_option})</small></td>
                <td><span className={`admin-badge ${question.is_active ? 'status-active' : 'status-inactive'}`}>{question.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td><div className="admin-row-actions"><Link href={`/admin/questions/${question.id}/edit`} aria-label={`Edit ${question.question_code}`}><Edit3 /></Link><button onClick={() => setDeleteTarget(question)} aria-label={`Hapus ${question.question_code}`}><Trash2 /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination"><span>Menampilkan {questions.length} dari {pagination.total} soal</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><strong>{pagination.page} / {pagination.totalPages}</strong><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div></div>
      {deleteTarget && <div className="admin-modal-backdrop"><section className="admin-confirm-modal" role="dialog" aria-modal="true"><div className="admin-danger-icon"><Trash2 /></div><h2>Hapus soal “{deleteTarget.question_code}”?</h2><p>Jika soal sudah pernah dijawab murid, soal akan dinonaktifkan agar riwayat nilai tetap akurat. Soal yang belum pernah dipakai akan dihapus permanen.</p><div><button className="admin-secondary-button" onClick={() => setDeleteTarget(null)}>Batal</button><button className="admin-danger-button" onClick={removeQuestion}>Hapus / Nonaktifkan</button></div></section></div>}
    </>
  )
}
