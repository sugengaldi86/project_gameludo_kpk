'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Calculator, CheckCircle2, Save } from 'lucide-react'
import type { AdminQuestion, OptionKey, QuestionInput } from '@/lib/admin-types'
import { calculateLcm, validateQuestionInput } from '@/lib/question-validation'

const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D']

const emptyQuestion: QuestionInput = {
  question_code: '', story: '', difficulty: 'sedang', topic: 'kpk',
  known_information: '', asked_information: '', strategy: 'KPK',
  number_a: 2, number_b: 3, number_c: null, correct_value: 6,
  operand_count: 2, context_type: 'kontekstual',
  correct_option: 'A', final_explanation: '', is_active: true,
  question_options: optionKeys.map((key) => ({ option_key: key, option_text: '', is_correct: key === 'A' })),
  question_solutions: [
    { method: 'multiples', steps: [], result: 6 },
    { method: 'prime_factorization', steps: [], result: 6 },
  ],
}

function normalizeQuestion(question: AdminQuestion): QuestionInput {
  const options = Array.isArray(question.question_options) ? question.question_options : []
  const solutions = Array.isArray(question.question_solutions) ? question.question_solutions : []
  const difficulty = question.difficulty === 'mudah' || question.difficulty === 'sedang' || question.difficulty === 'hots'
    ? question.difficulty
    : question.difficulty === 'tiga_bilangan' ? 'hots' : 'sedang'
  const correctOption = optionKeys.includes(question.correct_option) ? question.correct_option : 'A'
  const operandCount = question.operand_count === 3 || question.number_c ? 3 : 2

  return {
    ...question,
    question_code: question.question_code || '',
    story: question.story || '',
    difficulty,
    topic: question.topic || 'kpk',
    known_information: question.known_information || '',
    asked_information: question.asked_information || '',
    strategy: question.strategy || 'KPK',
    number_a: Number(question.number_a) || 1,
    number_b: Number(question.number_b) || 1,
    number_c: operandCount === 3 ? Number(question.number_c) || null : null,
    operand_count: operandCount,
    context_type: question.context_type === 'langsung' ? 'langsung' : 'kontekstual',
    correct_value: Number(question.correct_value) || 0,
    correct_option: correctOption,
    final_explanation: question.final_explanation || '',
    is_active: question.is_active !== false,
    question_options: optionKeys.map((key) => options.find((option) => option.option_key === key) || { option_key: key, option_text: '', is_correct: key === correctOption }),
    question_solutions: ['multiples', 'prime_factorization'].map((method) => solutions.find((solution) => solution.method === method) || { method, steps: [], result: Number(question.correct_value) || 0 }) as QuestionInput['question_solutions'],
  }
}

export function QuestionForm({ questionId }: { questionId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Jika ada ?difficulty=xxx di URL (dari shortcut ExamManager), gunakan sebagai nilai awal
  const initialDifficulty = searchParams.get('difficulty') as QuestionInput['difficulty'] | null
  const [form, setForm] = useState<QuestionInput>({
    ...emptyQuestion,
    ...(initialDifficulty && !questionId ? { difficulty: initialDifficulty } : {}),
  })
  const [loading, setLoading] = useState(Boolean(questionId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const calculatedLcm = useMemo(
    () => calculateLcm([
      form.number_a,
      form.number_b,
      ...(form.operand_count === 3 && form.number_c ? [form.number_c] : []),
    ].filter((number) => number > 0)),
    [form.number_a, form.number_b, form.number_c, form.operand_count],
  )

  useEffect(() => {
    if (!questionId) return
    fetch(`/api/admin/questions/${questionId}`)
      .then(async (response) => {
        const responseText = await response.text()
        let result: { error?: string; data?: AdminQuestion } = {}
        try { result = responseText ? JSON.parse(responseText) : {} }
        catch { result = { error: responseText } }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat soal')
        if (!result.data) throw new Error('Data soal tidak lengkap')
        setForm(normalizeQuestion(result.data))
      })
      .catch((loadError) => setError(loadError instanceof TypeError ? 'Tidak dapat terhubung ke server.' : loadError instanceof Error ? loadError.message : 'Gagal memuat soal'))
      .finally(() => setLoading(false))
  }, [questionId])

  function update<K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setCorrectOption(key: OptionKey) {
    setForm((current) => ({
      ...current,
      correct_option: key,
      question_options: current.question_options.map((option) => ({ ...option, is_correct: option.option_key === key })),
    }))
  }

  function updateOption(key: OptionKey, text: string) {
    setForm((current) => ({ ...current, question_options: current.question_options.map((option) => option.option_key === key ? { ...option, option_text: text } : option) }))
  }

  function updateSolution(method: 'multiples' | 'prime_factorization', text: string) {
    setForm((current) => ({
      ...current,
      question_solutions: current.question_solutions.map((solution) => solution.method === method ? { ...solution, steps: text.split('\n'), result: calculatedLcm } : solution),
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      ...form,
      number_c: form.operand_count === 3 ? form.number_c : null,
      correct_value: calculatedLcm,
      question_solutions: form.question_solutions.map((solution) => ({ ...solution, result: calculatedLcm })),
    }
    const validation = validateQuestionInput(payload)
    if (!validation.success) {
      setError(validation.error)
      return
    }

    setSaving(true)
    try {
      const response = await fetch(questionId ? `/api/admin/questions/${questionId}` : '/api/admin/questions', {
        method: questionId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      })
      const responseText = await response.text()
      let result: { error?: string; data?: unknown } = {}
      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        result = { error: responseText }
      }
      if (!response.ok) throw new Error(result.error || 'Soal gagal disimpan')
      setSuccess(questionId ? 'Perubahan soal berhasil disimpan.' : 'Soal baru berhasil ditambahkan.')
      if (!questionId) window.setTimeout(() => router.replace('/admin/questions'), 700)
    } catch (saveError) {
      const isNetworkError = saveError instanceof TypeError
      setError(isNetworkError
        ? 'Tidak dapat terhubung ke server. Periksa koneksi internet atau DNS, lalu coba lagi.'
        : saveError instanceof Error ? saveError.message : 'Soal gagal disimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <section className="admin-panel admin-form-loading">Memuat data soal...</section>

  return (
    <form className="admin-question-form" onSubmit={submit}>
      <div className="admin-form-actions top"><Link href="/admin/questions" className="admin-secondary-button"><ArrowLeft /> Kembali</Link><button className="admin-primary-button" disabled={saving}><Save /> {saving ? 'Menyimpan...' : 'Simpan Soal'}</button></div>
      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success"><CheckCircle2 />{success}</div>}

      <section className="admin-form-section"><div className="admin-form-section-heading"><span>1</span><div><h2>Identitas & cerita soal</h2><p>Informasi utama yang akan dilihat murid.</p></div></div><div className="admin-form-grid four"><label>Kode soal<input value={form.question_code} onChange={(event) => update('question_code', event.target.value.toUpperCase())} placeholder="Q01" required /></label><label>Tingkat kesulitan<select value={form.difficulty} onChange={(event) => update('difficulty', event.target.value as QuestionInput['difficulty'])}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="hots">HOTS</option></select></label><label>Jumlah bilangan<select value={form.operand_count} onChange={(event) => update('operand_count', Number(event.target.value) as 2|3)}><option value={2}>Dua bilangan</option><option value={3}>Tiga bilangan</option></select></label><label>Konteks<select value={form.context_type} onChange={(event) => update('context_type', event.target.value as QuestionInput['context_type'])}><option value="kontekstual">Cerita kontekstual</option><option value="langsung">Soal langsung</option></select></label></div><label>Cerita soal<textarea rows={5} value={form.story} onChange={(event) => update('story', event.target.value)} placeholder="Ibu pergi ke pasar setiap 4 hari..." required /></label></section>

      <section className="admin-form-section"><div className="admin-form-section-heading"><span>2</span><div><h2>Bilangan & strategi KPK</h2><p>Sistem menghitung nilai KPK secara otomatis.</p></div></div><div className="admin-form-grid four"><label>Bilangan A<input type="number" min="1" value={form.number_a} onChange={(event) => update('number_a', Number(event.target.value))} required /></label><label>Bilangan B<input type="number" min="1" value={form.number_b} onChange={(event) => update('number_b', Number(event.target.value))} required /></label><label>Bilangan C <small>(untuk tiga bilangan)</small><input type="number" min="1" disabled={form.operand_count===2} value={form.number_c ?? ''} onChange={(event) => update('number_c', event.target.value ? Number(event.target.value) : null)} /></label><div className="admin-lcm-preview"><Calculator /><span>KPK Otomatis<strong>{calculatedLcm}</strong></span></div></div><div className="admin-form-grid two"><label>Diketahui<textarea rows={3} value={form.known_information} onChange={(event) => update('known_information', event.target.value)} required /></label><label>Ditanyakan<textarea rows={3} value={form.asked_information} onChange={(event) => update('asked_information', event.target.value)} required /></label></div><label>Strategi benar<select value={form.strategy} onChange={(event) => update('strategy', event.target.value)}><option value="KPK">KPK</option><option value="FPB">FPB</option></select></label></section>

      <section className="admin-form-section"><div className="admin-form-section-heading"><span>3</span><div><h2>Pilihan jawaban</h2><p>Isi empat pilihan dan pilih tepat satu jawaban benar.</p></div></div><div className="admin-option-editor">{form.question_options.map((option) => <label key={option.option_key} className={option.is_correct ? 'is-correct' : ''}><input type="radio" name="correct-option" checked={option.is_correct} onChange={() => setCorrectOption(option.option_key)} /><strong>{option.option_key}</strong><input value={option.option_text} onChange={(event) => updateOption(option.option_key, event.target.value)} placeholder={`Pilihan ${option.option_key}`} required /><span>{option.is_correct ? 'Jawaban benar' : 'Tandai benar'}</span></label>)}</div></section>

      <section className="admin-form-section"><div className="admin-form-section-heading"><span>4</span><div><h2>Pembahasan Polya</h2><p>Tulis satu langkah per baris agar mudah ditampilkan pada modal feedback.</p></div></div><div className="admin-form-grid two"><label>Langkah Kelipatan<textarea rows={7} value={form.question_solutions.find((solution) => solution.method === 'multiples')?.steps.join('\n') || ''} onChange={(event) => updateSolution('multiples', event.target.value)} placeholder={'Kelipatan 4: 4, 8, 12...\nKelipatan 6: 6, 12...\nKPK = 12'} required /></label><label>Langkah Faktorisasi Prima<textarea rows={7} value={form.question_solutions.find((solution) => solution.method === 'prime_factorization')?.steps.join('\n') || ''} onChange={(event) => updateSolution('prime_factorization', event.target.value)} placeholder={'4 = 2²\n6 = 2 × 3\nKPK = 2² × 3 = 12'} required /></label></div><label>Jawaban akhir & cek ulang<textarea rows={4} value={form.final_explanation} onChange={(event) => update('final_explanation', event.target.value)} placeholder="Mereka akan bertemu kembali setelah 12 hari. Angka 12 habis dibagi 4 dan 6." required /></label><label className="admin-switch-row"><input type="checkbox" checked={form.is_active} onChange={(event) => update('is_active', event.target.checked)} /><span><strong>Aktifkan soal</strong><small>Soal aktif dapat dipilih dalam permainan.</small></span></label></section>

      <div className="admin-form-actions"><Link href="/admin/questions" className="admin-secondary-button">Batal</Link><button className="admin-primary-button" disabled={saving}><Save /> {saving ? 'Menyimpan...' : 'Simpan Soal'}</button></div>
    </form>
  )
}
