'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CalendarClock, Clock, Play, Square, Users, AlertTriangle, Plus, Pencil, X } from 'lucide-react'
import type { AdminExam } from '@/lib/admin-types'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', scheduled: 'Terjadwal', active: 'Aktif', finished: 'Selesai', cancelled: 'Dibatalkan',
}

const blank = {
  name: '', learning_goal: '', starts_at: '', ends_at: '',
  duration_minutes: 45, question_time_seconds: 90 as number | null,
  question_count: 20 as number | null, difficulty: '' as string | null,
  randomize_questions: true, randomize_options: false,
  late_tolerance_minutes: 10, auto_submit: true,
  allow_resume: true, allow_rejoin: true, max_attempts: 1, status: 'draft',
  selected_questions: [] as string[],
}

function toLocal(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function addMinutesToLocal(value: string, minutes: number) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() + Math.max(1, minutes))
  return toLocal(date.toISOString())
}

function formatCountdown(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '00:00'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type ExamWithRooms = AdminExam & { rooms?: { id: string; status: string }[], selected_questions?: string[] }

type CompactQuestion = { id: string; question_code: string; story: string; difficulty: string; is_active: boolean }

export function ExamManager() {
  const [exams, setExams] = useState<ExamWithRooms[]>([])
  const [form, setForm] = useState<Record<string, unknown>>(blank)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [countdown, setCountdown] = useState<Record<string, string>>({})
  const [ending, setEnding] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual'>('auto')
  const [allQuestions, setAllQuestions] = useState<CompactQuestion[]>([])
  const [qSearch, setQSearch] = useState('')
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    const r = await fetch('/api/admin/exams')
    const j = await r.json()
    if (r.ok) setExams(j.data ?? [])
    else setError(j.error)
  }

  // Tick countdown setiap detik untuk ujian aktif/terjadwal
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        const next: Record<string, string> = {}
        exams.forEach(e => {
          if (e.status === 'active' || e.status === 'scheduled') {
            next[e.id] = formatCountdown(e.ends_at)
          }
        })
        return Object.keys(next).length ? next : prev
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [exams])

  useEffect(() => { void load() }, [])

  // Fetch jumlah soal aktif berdasarkan tingkat kesulitan yang dipilih
  useEffect(() => {
    if (!formOpen) return
    const difficulty = form.difficulty as string | null
    setLoadingCount(true)
    const params = new URLSearchParams({ pageSize: '1', status: 'active' })
    if (difficulty) params.set('difficulty', difficulty)
    fetch(`/api/admin/questions?${params}`)
      .then(r => r.json())
      .then(j => setQuestionCount(j.pagination?.total ?? null))
      .catch(() => setQuestionCount(null))
      .finally(() => setLoadingCount(false))
  }, [form.difficulty, formOpen])

  // Load semua soal untuk opsi manual
  useEffect(() => {
    if (!formOpen || selectionMode !== 'manual' || allQuestions.length > 0) return
    setLoadingQuestions(true)
    fetch('/api/admin/questions?pageSize=1000&status=active')
      .then(r => r.json())
      .then(j => setAllQuestions(j.data || []))
      .finally(() => setLoadingQuestions(false))
  }, [formOpen, selectionMode, allQuestions.length])

  const change = (key: string, value: unknown) => setForm(v => ({ ...v, [key]: value }))

  const openNew = () => {
    setEditing(null)
    setForm(blank)
    setSelectionMode('auto')
    setError('')
    setFormOpen(true)
    setTimeout(() => document.getElementById('exam-name-input')?.focus(), 80)
  }

  const openEdit = (exam: ExamWithRooms) => {
    setEditing(exam.id)
    const selected = exam.selected_questions || []
    setSelectionMode(selected.length > 0 ? 'manual' : 'auto')
    setForm({
      ...exam,
      selected_questions: selected,
      starts_at: toLocal(exam.starts_at),
      ends_at: toLocal(exam.ends_at),
    })
    setError('')
    setFormOpen(true)
    setTimeout(() => document.getElementById('exam-name-input')?.focus(), 80)
  }

  const cancelForm = () => { setFormOpen(false); setEditing(null); setForm(blank); setError('') }

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    const startsAt = new Date(String(form.starts_at))
    const endsAt = new Date(String(form.ends_at))
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setError('Waktu mulai dan waktu selesai wajib diisi dengan benar.')
      return
    }
    if (endsAt <= startsAt) {
      setError('Waktu selesai harus lebih akhir daripada waktu mulai.')
      document.querySelector<HTMLInputElement>('input[name="exam-ends-at"]')?.focus()
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      }
      if (selectionMode === 'auto') payload.selected_questions = []
      const url = editing ? `/api/admin/exams/${editing}` : '/api/admin/exams'
      const r = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      cancelForm(); await load()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Gagal menyimpan ujian')
      window.setTimeout(() => document.querySelector('.exam-form-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
    finally { setSaving(false) }
  }

  const patchStatus = async (id: string, status: string) => {
    if (status === 'finished') {
      setEnding(id)
      if (!window.confirm('Akhiri ujian ini sekarang? Semua room yang terhubung akan diselesaikan.')) { setEnding(null); return }
    }
    const r = await fetch(`/api/admin/exams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (r.ok) await load(); else setError((await r.json()).error)
    setEnding(null)
  }

  const deleteExam = async (id: string) => {
    setDeleting(id)
    if (!window.confirm('Hapus ujian ini secara permanen?')) { setDeleting(null); return }
    const r = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' })
    if (r.ok) await load(); else setError((await r.json()).error)
    setDeleting(null)
  }

  const activeExams = exams.filter(e => e.status === 'active')
  const otherExams = exams.filter(e => e.status !== 'active')

  return (
    <div className="exam-manager">

      {/* ── Tombol buat ujian baru ── */}
      <div className="exam-manager-toolbar">
        <div className="exam-manager-title">
          <span className="admin-kicker">JADWAL DAN WAKTU</span>
          <h1>Pengaturan Ujian</h1>
          <p>Atur jadwal, durasi, batas waktu soal, dan perilaku ujian.</p>
        </div>
        <button className="admin-primary-button" onClick={openNew} id="btn-new-exam">
          <Plus size={15} /> Buat ujian baru
        </button>
      </div>

      {error && <div className="admin-alert error" role="alert"><AlertTriangle size={15} />{error}</div>}

      {/* ── FORM (slide-down) ── */}
      {formOpen && (
        <section className="exam-form-panel admin-panel" aria-label="Form ujian">
          <div className="exam-form-header">
            <div>
              <span className="admin-kicker">{editing ? 'UBAH UJIAN' : 'UJIAN BARU'}</span>
              <h2>{editing ? 'Perbarui pengaturan ujian' : 'Buat ujian baru'}</h2>
            </div>
            <button className="exam-close-btn" onClick={cancelForm} aria-label="Tutup form"><X size={18} /></button>
          </div>

          <form onSubmit={save} className="exam-form-body">
            {/* Informasi dasar */}
            <div className="exam-form-section">
              <p className="exam-section-label">Informasi dasar</p>
              <label>
                Nama ujian <span className="exam-required">*</span>
                <input id="exam-name-input" required value={String(form.name)} onChange={e => change('name', e.target.value)} placeholder="Contoh: Evaluasi KPK Kelas 5A" />
              </label>
              <label>
                Tujuan pembelajaran
                <textarea rows={2} value={String(form.learning_goal)} onChange={e => change('learning_goal', e.target.value)} placeholder="Siswa mampu menentukan KPK dua bilangan…" />
              </label>
            </div>

            {/* Jadwal */}
            <div className="exam-form-section">
              <p className="exam-section-label">Jadwal ujian <small>(zona waktu perangkat — Asia/Jakarta)</small></p>
              <div className="exam-field-row">
                <label>Waktu mulai <span className="exam-required">*</span><input required type="datetime-local" value={String(form.starts_at)} onChange={e => {
                  const startsAt = e.target.value
                  const currentEnd = new Date(String(form.ends_at))
                  change('starts_at', startsAt)
                  if (!form.ends_at || Number.isNaN(currentEnd.getTime()) || currentEnd <= new Date(startsAt)) change('ends_at', addMinutesToLocal(startsAt, Number(form.duration_minutes) || 45))
                }} /></label>
                <label>Waktu selesai <span className="exam-required">*</span><input name="exam-ends-at" required type="datetime-local" min={form.starts_at ? addMinutesToLocal(String(form.starts_at), 1) : undefined} value={String(form.ends_at)} onChange={e => change('ends_at', e.target.value)} /></label>
              </div>
            </div>

            {/* Waktu */}
            <div className="exam-form-section">
              <p className="exam-section-label">Pengaturan waktu</p>
              <div className="exam-field-row">
                <label>Durasi ujian (menit) <span className="exam-required">*</span><input type="number" min={1} max={480} required value={Number(form.duration_minutes)} onChange={e => {
                  const duration = Number(e.target.value)
                  change('duration_minutes', duration)
                  if (form.starts_at) change('ends_at', addMinutesToLocal(String(form.starts_at), duration))
                }} /></label>
                <label>Waktu per soal (detik)<small>Kosongkan = tanpa batas</small><input type="number" min={10} max={3600} value={form.question_time_seconds !== null ? Number(form.question_time_seconds) : ''} onChange={e => change('question_time_seconds', e.target.value ? Number(e.target.value) : null)} placeholder="Misal: 90" /></label>
                <label>Toleransi terlambat (menit)<input type="number" min={0} max={120} value={Number(form.late_tolerance_minutes)} onChange={e => change('late_tolerance_minutes', Number(e.target.value))} /></label>
              </div>
            </div>

            {/* Soal */}
            <div className="exam-form-section">
              <p className="exam-section-label">Pengaturan soal</p>
              
              <div className="exam-mode-toggle">
                <label className={selectionMode === 'auto' ? 'selected' : ''}>
                  <input type="radio" checked={selectionMode === 'auto'} onChange={() => setSelectionMode('auto')} /> 
                  <span><strong>Otomatis</strong><small>Acak berdasarkan tingkat kesulitan</small></span>
                </label>
                <label className={selectionMode === 'manual' ? 'selected' : ''}>
                  <input type="radio" checked={selectionMode === 'manual'} onChange={() => setSelectionMode('manual')} />
                  <span><strong>Manual</strong><small>Pilih sendiri soal yang akan digunakan</small></span>
                </label>
              </div>

              {selectionMode === 'auto' && (
                <>
                  <div className="exam-field-row">
                    <label>Jumlah soal yang dimunculkan<small>Kosongkan = semua soal sesuai tingkat</small><input type="number" min={1} max={500} value={form.question_count !== null ? Number(form.question_count) : ''} onChange={e => change('question_count', e.target.value ? Number(e.target.value) : null)} /></label>
                    <label>
                      Tingkat kesulitan
                      <small>Kosongkan = semua tingkat</small>
                      <select value={String(form.difficulty ?? '')} onChange={e => change('difficulty', e.target.value || null)}>
                        <option value="">Semua tingkat</option>
                        <option value="mudah">Mudah</option>
                        <option value="sedang">Sedang</option>
                        <option value="kontekstual">Kontekstual</option>
                        <option value="tiga_bilangan">Tiga bilangan</option>
                      </select>
                      <span className={`exam-q-count-badge${questionCount === 0 ? ' zero' : ''}`}>
                        {loadingCount ? 'Menghitung…' : questionCount !== null ? `${questionCount} soal aktif tersedia` : ''}
                      </span>
                    </label>
                    <label>Maks. percobaan<input type="number" min={1} max={10} value={Number(form.max_attempts)} onChange={e => change('max_attempts', Number(e.target.value))} /></label>
                  </div>

                  {/* Shortcut ke bank soal sesuai tingkat kesulitan */}
                  <div className="exam-qbank-shortcut">
                    <BookOpen size={15} />
                    <span>
                      {questionCount === 0
                        ? <strong className="exam-qbank-warn">⚠ Tidak ada soal aktif untuk tingkat ini! Tambah soal terlebih dahulu.</strong>
                        : <span>Bank soal {form.difficulty ? `tingkat kesulitan "${form.difficulty}"` : '(semua tingkat)'}</span>
                      }
                    </span>
                    <div className="exam-qbank-links">
                      <Link
                        href={form.difficulty ? `/admin/questions?difficulty=${form.difficulty}&status=active` : '/admin/questions?status=active'}
                        target="_blank"
                        className="admin-secondary-button exam-qbank-btn"
                      >
                        Lihat soal
                      </Link>
                      <Link
                        href={form.difficulty ? `/admin/questions/new?difficulty=${form.difficulty}` : '/admin/questions/new'}
                        target="_blank"
                        className="admin-primary-button exam-qbank-btn"
                      >
                        <Plus size={13} /> Tambah soal
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {selectionMode === 'manual' && (
                <div className="exam-manual-q-picker">
                  <div className="exam-q-picker-header">
                    <span>Soal terpilih: <strong>{((form.selected_questions as string[]) || []).length}</strong></span>
                    <input 
                      type="text" 
                      placeholder="Cari kode atau cerita..."
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      className="exam-q-search"
                    />
                  </div>
                  <div className="exam-q-list">
                    {loadingQuestions ? (
                      <div className="exam-q-list-empty">Memuat soal...</div>
                    ) : allQuestions.length === 0 ? (
                      <div className="exam-q-list-empty">Belum ada soal aktif di Bank Soal.</div>
                    ) : (
                      allQuestions
                        .filter(q => 
                          q.question_code.toLowerCase().includes(qSearch.toLowerCase()) || 
                          q.story.toLowerCase().includes(qSearch.toLowerCase())
                        )
                        .map(q => {
                          const selected = ((form.selected_questions as string[]) || []).includes(q.id)
                          return (
                            <label key={q.id} className={`exam-q-item ${selected ? 'selected' : ''}`}>
                              <input 
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  const curr = (form.selected_questions as string[]) || []
                                  if (e.target.checked) change('selected_questions', [...curr, q.id])
                                  else change('selected_questions', curr.filter(id => id !== q.id))
                                }}
                              />
                              <div className="exam-q-item-info">
                                <strong>{q.question_code}</strong>
                                <span className={`admin-badge difficulty-${q.difficulty}`}>{q.difficulty.replace('_', ' ')}</span>
                                <p>{q.story}</p>
                              </div>
                            </label>
                          )
                        })
                    )}
                  </div>
                  <div className="exam-field-row" style={{ marginTop: 12 }}>
                    <label>Maks. percobaan<input type="number" min={1} max={10} value={Number(form.max_attempts)} onChange={e => change('max_attempts', Number(e.target.value))} /></label>
                    <label>Jumlah soal per sesi<small>Kosongkan = memunculkan semua soal yg dipilih</small><input type="number" min={1} max={500} value={form.question_count !== null ? Number(form.question_count) : ''} onChange={e => change('question_count', e.target.value ? Number(e.target.value) : null)} /></label>
                  </div>
                </div>
              )}

              <div className="exam-checks">
                <label><input type="checkbox" checked={Boolean(form.randomize_questions)} onChange={e => change('randomize_questions', e.target.checked)} /> Acak urutan soal</label>
                <label><input type="checkbox" checked={Boolean(form.randomize_options)} onChange={e => change('randomize_options', e.target.checked)} /> Acak pilihan jawaban</label>
                <label><input type="checkbox" checked={Boolean(form.auto_submit)} onChange={e => change('auto_submit', e.target.checked)} /> Auto-submit saat koneksi kembali</label>
                <label><input type="checkbox" checked={Boolean(form.allow_resume)} onChange={e => change('allow_resume', e.target.checked)} /> Boleh lanjut setelah refresh</label>
                <label><input type="checkbox" checked={Boolean(form.allow_rejoin)} onChange={e => change('allow_rejoin', e.target.checked)} /> Boleh keluar lalu masuk kembali</label>
              </div>
            </div>

            {/* Status & aksi */}
            <div className="exam-form-section exam-form-footer">
              <label>Status publikasi
                <select value={String(form.status)} onChange={e => change('status', e.target.value)}>
                  <option value="draft">Draft — belum dipublikasikan</option>
                  <option value="scheduled">Terjadwal — siswa dapat bergabung sesuai jadwal</option>
                  <option value="active">Aktif — langsung dapat dimulai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </label>
              <div className="exam-form-actions">
                <button type="button" className="admin-secondary-button" onClick={cancelForm}>Batal</button>
                <button type="submit" className="admin-primary-button" disabled={saving}>
                  {saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Buat ujian'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* ── Monitor ujian aktif ── */}
      {activeExams.length > 0 && (
        <section aria-label="Ujian sedang berlangsung">
          <h2 className="exam-section-heading"><span className="exam-live-dot" />Sedang berlangsung</h2>
          <div className="exam-monitor-grid">
            {activeExams.map(exam => {
              const rooms = exam.rooms ?? []
              const playingRooms = rooms.filter(r => r.status === 'playing')
              const finishedRooms = rooms.filter(r => r.status === 'finished')
              const cd = countdown[exam.id] ?? formatCountdown(exam.ends_at)
              const diffMs = new Date(exam.ends_at).getTime() - Date.now()
              const urgency = diffMs < 300_000 ? 'critical' : diffMs < 600_000 ? 'warning' : ''
              return (
                <article key={exam.id} className="exam-monitor-card">
                  <div className="exam-monitor-top">
                    <div>
                      <span className={`exam-status-badge active`}>Aktif</span>
                      <h3>{exam.name}</h3>
                      {exam.learning_goal && <p className="exam-goal">{exam.learning_goal}</p>}
                    </div>
                    <div className={`exam-countdown ${urgency}`}>
                      <Clock size={14} />
                      <span>{cd}</span>
                      <small>tersisa</small>
                    </div>
                  </div>
                  <div className="exam-monitor-stats">
                    <div><CalendarClock size={15} /><span>{exam.duration_minutes} menit</span><small>Durasi</small></div>
                    <div><Users size={15} /><span>{rooms.length}</span><small>Room</small></div>
                    <div><Play size={15} /><span>{playingRooms.length}</span><small>Bermain</small></div>
                    <div><Square size={15} /><span>{finishedRooms.length}</span><small>Selesai</small></div>
                  </div>
                  <div className="exam-monitor-actions">
                    <button className="admin-secondary-button" onClick={() => openEdit(exam)}><Pencil size={13} /> Ubah</button>
                    <button className="admin-danger-button" onClick={() => patchStatus(exam.id, 'finished')} disabled={ending === exam.id}>
                      <Square size={13} /> {ending === exam.id ? 'Mengakhiri…' : 'Akhiri ujian sekarang'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Daftar semua ujian lain ── */}
      <section aria-label="Daftar ujian">
        <div className="exam-list-heading">
          <div><h2>Ujian lainnya</h2><p>Ujian terjadwal, draft, selesai, dan dibatalkan.</p></div>
          <span>{otherExams.length} ujian</span>
        </div>
        {exams.length === 0 ? (
          <div className="exam-empty">
            <CalendarClock size={36} />
            <p>Belum ada ujian. Klik <strong>Buat ujian baru</strong> untuk memulai.</p>
          </div>
        ) : otherExams.length === 0 ? (
          <div className="exam-empty compact"><p>Belum ada ujian lainnya.</p></div>
        ) : (
          <div className="exam-list">
            {otherExams.map(exam => {
              const rooms = exam.rooms ?? []
              const cd = (exam.status === 'active' || exam.status === 'scheduled') ? (countdown[exam.id] ?? formatCountdown(exam.ends_at)) : null
              return (
                <article key={exam.id} className={`exam-list-item ${exam.status}`}>
                  <div className="exam-list-main">
                    <span className={`exam-status-badge ${exam.status}`}>{STATUS_LABEL[exam.status] ?? exam.status}</span>
                    <div className="exam-list-info">
                      <strong>{exam.name}</strong>
                      <span>
                        {new Date(exam.starts_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} –{' '}
                        {new Date(exam.ends_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <small>
                        {exam.duration_minutes} mnt
                        {exam.question_time_seconds ? ` · ${exam.question_time_seconds} dtk/soal` : ' · tanpa batas per soal'}
                        {exam.question_count ? ` · ${exam.question_count} soal` : ''}
                        {` · ${rooms.length} room`}
                      </small>
                    </div>
                    {cd && (
                      <div className="exam-list-countdown">
                        <Clock size={13} /> {cd}
                      </div>
                    )}
                  </div>
                  <div className="exam-list-actions">
                    {!['finished', 'cancelled'].includes(exam.status) && (
                      <button className="admin-secondary-button" onClick={() => openEdit(exam)}><Pencil size={13} /> Ubah</button>
                    )}
                    {exam.status === 'scheduled' && (
                      <button className="admin-secondary-button" onClick={() => patchStatus(exam.id, 'active')}><Play size={13} /> Aktifkan</button>
                    )}
                    {exam.status === 'active' && (
                      <button className="admin-danger-button" onClick={() => patchStatus(exam.id, 'finished')} disabled={ending === exam.id}>
                        <Square size={13} /> Akhiri
                      </button>
                    )}
                    {['draft', 'cancelled'].includes(exam.status) && (
                      <button className="admin-secondary-button exam-delete-btn" onClick={() => deleteExam(exam.id)} disabled={deleting === exam.id}>
                        {deleting === exam.id ? 'Menghapus…' : <><X size={13} /> Hapus</>}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
