'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { BookOpen, GraduationCap, Pencil, Plus, RotateCcw, Save, X } from 'lucide-react'

type Content = { id?: string; content_type: 'objective' | 'material'; title: string; body: string; image_url: string | null; display_order: number; show_in_briefing: boolean; is_active: boolean }
type Essay = { id?: string; question_code: string; story: string; answer_know: string; answer_asked: string; answer_plan: string; answer_solution: string; answer_check: string; score_weight: number; display_order: number; difficulty: string; operand_count: number; is_active: boolean }
type LearningResponse = { error?: string; data?: { contents: Content[]; essays: Essay[] } }

const emptyContent: Content = { content_type: 'material', title: '', body: '', image_url: null, display_order: 0, show_in_briefing: true, is_active: true }
const emptyEssay: Essay = { question_code: '', story: '', answer_know: '', answer_asked: '', answer_plan: '', answer_solution: '', answer_check: '', score_weight: 10, display_order: 0, difficulty: 'sedang', operand_count: 2, is_active: true }

async function readResponse(response: Response): Promise<LearningResponse> {
  const text = await response.text()
  if (!text) return {}
  try { return JSON.parse(text) }
  catch { return { error: text } }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) return 'Tidak dapat terhubung ke server. Periksa koneksi internet atau DNS.'
  return error instanceof Error ? error.message : fallback
}

function normalizeContent(item: Content): Content {
  return {
    ...emptyContent,
    ...item,
    content_type: item.content_type === 'objective' ? 'objective' : 'material',
    title: item.title || '',
    body: item.body || '',
    image_url: item.image_url || null,
    display_order: Number(item.display_order) || 0,
    show_in_briefing: item.show_in_briefing !== false,
    is_active: item.is_active !== false,
  }
}

function normalizeEssay(item: Essay): Essay {
  const difficulty = ['mudah', 'sedang', 'hots'].includes(item.difficulty)
    ? item.difficulty
    : item.difficulty === 'tiga_bilangan' ? 'hots' : 'sedang'
  return {
    ...emptyEssay,
    ...item,
    question_code: item.question_code || '',
    story: item.story || '',
    answer_know: item.answer_know || '',
    answer_asked: item.answer_asked || '',
    answer_plan: item.answer_plan || '',
    answer_solution: item.answer_solution || '',
    answer_check: item.answer_check || '',
    score_weight: Number(item.score_weight) || 10,
    display_order: Number(item.display_order) || 0,
    difficulty,
    operand_count: item.operand_count === 3 ? 3 : 2,
    is_active: item.is_active !== false,
  }
}

export function LearningManager() {
  const [contents, setContents] = useState<Content[]>([])
  const [essays, setEssays] = useState<Essay[]>([])
  const [content, setContent] = useState<Content | null>(null)
  const [essay, setEssay] = useState<Essay | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showInactiveContents, setShowInactiveContents] = useState(false)
  const [showInactiveEssays, setShowInactiveEssays] = useState(false)
  const contentFormRef = useRef<HTMLFormElement>(null)
  const essayFormRef = useRef<HTMLFormElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/learning', { cache: 'no-store' })
      const result = await readResponse(response)
      if (!response.ok || !result.data) throw new Error(result.error || 'Gagal memuat data')
      setContents(result.data.contents.map(normalizeContent))
      setEssays(result.data.essays.map(normalizeEssay))
      setError('')
    } catch (loadError) { setError(errorMessage(loadError, 'Gagal memuat data')) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  function openContentEditor(item: Content) {
    setContent(item)
    setEssay(null)
    window.setTimeout(() => contentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function openEssayEditor(item: Essay) {
    setEssay(item)
    setContent(null)
    window.setTimeout(() => essayFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  async function save(event: FormEvent, entity: 'content' | 'essay') {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = entity === 'content' ? content : essay
      const response = await fetch('/api/admin/learning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, ...payload }),
      })
      const result = await readResponse(response)
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan')
      setContent(null)
      setEssay(null)
      await load()
    } catch (saveError) { setError(errorMessage(saveError, 'Gagal menyimpan')) }
    finally { setSaving(false) }
  }

  async function deactivate(entity: 'content' | 'essay', id?: string) {
    if (!id || !confirm('Nonaktifkan item ini?')) return
    setError('')
    try {
      const response = await fetch(`/api/admin/learning?entity=${entity}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await readResponse(response)
      if (!response.ok) throw new Error(result.error || 'Gagal menonaktifkan data')
      await load()
    } catch (deleteError) { setError(errorMessage(deleteError, 'Gagal menonaktifkan data')) }
  }

  async function reactivate(entity: 'content' | 'essay', item: Content | Essay) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/learning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, ...item, is_active: true }),
      })
      const result = await readResponse(response)
      if (!response.ok) throw new Error(result.error || 'Gagal mengaktifkan kembali data')
      await load()
    } catch (activateError) { setError(errorMessage(activateError, 'Gagal mengaktifkan kembali data')) }
    finally { setSaving(false) }
  }

  return <div className="admin-learning-stack">
    {error && <div className="admin-alert error">{error}</div>}

    <section className="admin-panel">
      <div className="admin-panel-title"><div><span className="admin-kicker">KONTEN AWAL</span><h2>Tujuan pembelajaran & materi</h2></div><button className="admin-primary-button" onClick={() => openContentEditor({ ...emptyContent })}><Plus />Tambah materi</button></div>
      <label className="admin-switch-row"><input type="checkbox" checked={showInactiveContents} onChange={event => setShowInactiveContents(event.target.checked)} /><span><strong>Tampilkan konten nonaktif</strong><small>Konten nonaktif disembunyikan agar daftar tetap ringkas.</small></span></label>
      <div className="admin-content-cards">{contents.filter(item => showInactiveContents || item.is_active).map(item => <article key={item.id} className={!item.is_active ? 'inactive' : ''}>
        <div className="admin-content-icon">{item.content_type === 'objective' ? <GraduationCap /> : <BookOpen />}</div>
        <div><small>{item.content_type === 'objective' ? 'TUJUAN PEMBELAJARAN' : 'MATERI'}{!item.is_active ? ' · NONAKTIF' : ''}</small><strong>{item.title}</strong><p>{item.body}</p></div>
        <button onClick={() => openContentEditor({ ...item })} aria-label={`Edit ${item.title}`} title="Edit"><Pencil /></button>
        {item.is_active
          ? <button onClick={() => deactivate('content', item.id)} aria-label={`Nonaktifkan ${item.title}`} title="Nonaktifkan"><X /></button>
          : <button onClick={() => reactivate('content', item)} aria-label={`Aktifkan kembali ${item.title}`} title="Aktifkan kembali" disabled={saving}><RotateCcw /></button>}
      </article>)}</div>
    </section>

    {content && <form ref={contentFormRef} className="admin-form-section" onSubmit={event => save(event, 'content')}>
      <div className="admin-form-section-heading"><span>TP</span><div><h2>{content.id ? 'Ubah konten' : 'Tambah konten'}</h2><p>Konten aktif ditampilkan pada halaman siswa.</p></div></div>
      <div className="admin-form-grid two">
        <label>Jenis<select value={content.content_type} onChange={event => setContent({ ...content, content_type: event.target.value as Content['content_type'] })}><option value="objective">Tujuan Pembelajaran</option><option value="material">Materi</option></select></label>
        <label>Urutan<input type="number" value={content.display_order} onChange={event => setContent({ ...content, display_order: Number(event.target.value) })} /></label>
      </div>
      <label>Judul<input required value={content.title} onChange={event => setContent({ ...content, title: event.target.value })} /></label>
      <label>Isi<textarea required rows={6} value={content.body} onChange={event => setContent({ ...content, body: event.target.value })} /></label>
      <label>URL gambar (opsional)<input type="url" value={content.image_url || ''} onChange={event => setContent({ ...content, image_url: event.target.value })} /></label>
      {content.content_type === 'material' && <label className="admin-switch-row"><input type="checkbox" checked={content.show_in_briefing} onChange={event => setContent({ ...content, show_in_briefing: event.target.checked })} /><span><strong>Tampilkan pada ringkasan sebelum game</strong><small>Materi lengkap tetap tersedia pada halaman Materi.</small></span></label>}
      <label className="admin-switch-row"><input type="checkbox" checked={content.is_active} onChange={event => setContent({ ...content, is_active: event.target.checked })} /><span><strong>Konten aktif</strong><small>Aktifkan kembali konten yang sebelumnya dinonaktifkan.</small></span></label>
      <div className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={() => setContent(null)}>Batal</button><button className="admin-primary-button" disabled={saving}><Save />{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
    </form>}

    <section className="admin-panel">
      <div className="admin-panel-title"><div><span className="admin-kicker">FASE 1</span><h2>Bank soal uraian</h2></div><button className="admin-primary-button" onClick={() => openEssayEditor({ ...emptyEssay })}><Plus />Tambah uraian</button></div>
      <label className="admin-switch-row"><input type="checkbox" checked={showInactiveEssays} onChange={event => setShowInactiveEssays(event.target.checked)} /><span><strong>Tampilkan soal nonaktif</strong><small>Soal nonaktif dapat diaktifkan kembali.</small></span></label>
      <div className="admin-essay-list">{essays.filter(item => showInactiveEssays || item.is_active).map(item => <article key={item.id} className={!item.is_active ? 'inactive' : ''}>
        <span>{item.question_code}</span><div><strong>{item.story}</strong><small>Bobot {item.score_weight} · urutan {item.display_order}{!item.is_active ? ' · nonaktif' : ''}</small></div>
        <button onClick={() => openEssayEditor({ ...item })} aria-label={`Edit ${item.question_code}`} title="Edit"><Pencil /></button>
        {item.is_active
          ? <button onClick={() => deactivate('essay', item.id)} aria-label={`Nonaktifkan ${item.question_code}`} title="Nonaktifkan"><X /></button>
          : <button onClick={() => reactivate('essay', item)} aria-label={`Aktifkan kembali ${item.question_code}`} title="Aktifkan kembali" disabled={saving}><RotateCcw /></button>}
      </article>)}</div>
    </section>

    {essay && <form ref={essayFormRef} className="admin-question-form" onSubmit={event => save(event, 'essay')}><section className="admin-form-section">
      <div className="admin-form-section-heading"><span>U</span><div><h2>{essay.id ? 'Ubah soal uraian' : 'Tambah soal uraian'}</h2><p>Simpan acuan empat tahap Polya untuk membantu koreksi manual.</p></div></div>
      <div className="admin-form-grid four">
        <label>Kode<input required value={essay.question_code} onChange={event => setEssay({ ...essay, question_code: event.target.value.toUpperCase() })} placeholder="U-KPK-01" /></label>
        <label>Kesulitan<select value={essay.difficulty} onChange={event => setEssay({ ...essay, difficulty: event.target.value })}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="hots">HOTS</option></select></label>
        <label>Jumlah bilangan<select value={essay.operand_count} onChange={event => setEssay({ ...essay, operand_count: Number(event.target.value) })}><option value={2}>Dua bilangan</option><option value={3}>Tiga bilangan</option></select></label>
        <label>Urutan<input type="number" value={essay.display_order} onChange={event => setEssay({ ...essay, display_order: Number(event.target.value) })} /></label>
      </div>
      <label>Teks soal<textarea required minLength={20} rows={4} value={essay.story} onChange={event => setEssay({ ...essay, story: event.target.value })} /></label>
      <div className="admin-form-grid two">{([['answer_know', 'Tahap 1 · Acuan Diketahui'], ['answer_asked', 'Tahap 1 · Acuan Ditanyakan'], ['answer_plan', 'Tahap 2 · Acuan Rencana Pemecahan'], ['answer_solution', 'Tahap 3 · Acuan Pelaksanaan Rencana'], ['answer_check', 'Tahap 4 · Acuan Pemeriksaan Kembali']] as const).map(([key, label]) => <label key={key}>{label}<textarea rows={4} value={essay[key] || ''} onChange={event => setEssay({ ...essay, [key]: event.target.value })} /></label>)}</div>
      <div className="admin-form-grid two"><label>Bobot nilai<input type="number" min="1" value={essay.score_weight} onChange={event => setEssay({ ...essay, score_weight: Number(event.target.value) })} /></label><label className="admin-switch-row"><input type="checkbox" checked={essay.is_active} onChange={event => setEssay({ ...essay, is_active: event.target.checked })} /><span><strong>Soal aktif</strong><small>Aktifkan kembali soal yang dinonaktifkan.</small></span></label></div>
      <div className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={() => setEssay(null)}>Batal</button><button className="admin-primary-button" disabled={saving}><Save />{saving ? 'Menyimpan...' : 'Simpan soal'}</button></div>
    </section></form>}
  </div>
}
