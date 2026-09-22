import Link from 'next/link'
import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarClock, Target, Users } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'

function percentage(correct: number | null, total: number | null) {
  return total ? Math.round(((correct || 0) / total) * 100) : 0
}

export default async function AdminDashboardPage() {
  const supabase = supabaseServer()
  const [questions, profiles, answers, progress] = await Promise.all([
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('player_answers').select('is_correct'),
    supabase.from('learning_progress').select(
      'identify_known_correct,identify_known_total,strategy_correct,strategy_total,kpk_correct,kpk_total,verification_correct,verification_total'
    ),
  ])

  const databaseError = questions.error || profiles.error || answers.error || progress.error
  if (databaseError) {
    return <div className="admin-alert error" role="alert">Dashboard tidak dapat memuat data Supabase: {databaseError.message}</div>
  }

  const answerRows = answers.data || []
  const averageAccuracy = answerRows.length
    ? Math.round((answerRows.filter((answer) => answer.is_correct).length / answerRows.length) * 100)
    : 0

  const totals = (progress.data || []).reduce(
    (sum, row) => ({
      informationCorrect: sum.informationCorrect + (row.identify_known_correct || 0),
      informationTotal: sum.informationTotal + (row.identify_known_total || 0),
      strategyCorrect: sum.strategyCorrect + (row.strategy_correct || 0),
      strategyTotal: sum.strategyTotal + (row.strategy_total || 0),
      kpkCorrect: sum.kpkCorrect + (row.kpk_correct || 0),
      kpkTotal: sum.kpkTotal + (row.kpk_total || 0),
      verificationCorrect: sum.verificationCorrect + (row.verification_correct || 0),
      verificationTotal: sum.verificationTotal + (row.verification_total || 0),
    }),
    { informationCorrect: 0, informationTotal: 0, strategyCorrect: 0, strategyTotal: 0, kpkCorrect: 0, kpkTotal: 0, verificationCorrect: 0, verificationTotal: 0 }
  )

  const indicators = [
    { label: 'Memahami Informasi', value: percentage(totals.informationCorrect, totals.informationTotal) },
    { label: 'Menentukan Strategi', value: percentage(totals.strategyCorrect, totals.strategyTotal) },
    { label: 'Menghitung KPK', value: percentage(totals.kpkCorrect, totals.kpkTotal) },
    { label: 'Memeriksa Jawaban', value: percentage(totals.verificationCorrect, totals.verificationTotal) },
  ]
  const weakest = indicators.reduce((lowest, item) => item.value < lowest.value ? item : lowest, indicators[0])

  return (
    <>
      <header className="admin-page-heading">
        <div><span className="admin-kicker">RINGKASAN</span><h1>Selamat datang di Dashboard Ludo KPK</h1><p>Pantau bank soal dan perkembangan belajar murid dari satu tempat.</p></div>
      </header>
      <section className="admin-metric-grid">
        <article className="admin-metric blue"><div className="admin-metric-icon"><BookOpenCheck /></div><div><span>Total Soal</span><strong>{questions.count ?? 0}</strong><small>Soal dalam bank</small></div></article>
        <article className="admin-metric green"><div className="admin-metric-icon"><Users /></div><div><span>Total Murid</span><strong>{profiles.count ?? 0}</strong><small>Profil pemain tercatat</small></div></article>
        <article className="admin-metric amber"><div className="admin-metric-icon"><Target /></div><div><span>Rata-rata Akurasi</span><strong>{averageAccuracy}%</strong><small>Dari {answerRows.length} jawaban</small></div></article>
      </section>
      <section className="admin-dashboard-grid">
        <article className="admin-panel">
          <div className="admin-panel-title"><div><span className="admin-kicker">MENU CEPAT</span><h2>Kelola pembelajaran</h2></div></div>
          <div className="admin-quick-links">
            <Link href="/admin/questions"><BookOpenCheck /><span><strong>Kelola Bank Soal</strong><small>Tambah, edit, filter, dan nonaktifkan soal.</small></span><ArrowRight /></Link>
            <Link href="/admin/exams"><CalendarClock /><span><strong>Pengaturan Ujian</strong><small>Buat ujian, atur waktu, dan mulai game kelas.</small></span><ArrowRight /></Link>
            <Link href="/admin/reports"><Users /><span><strong>Rekap Nilai Siswa</strong><small>Lihat akurasi dan indikator pembelajaran.</small></span><ArrowRight /></Link>
          </div>
        </article>
        <article className="admin-panel admin-attention-panel">
          <div className="admin-panel-title"><div><span className="admin-kicker">INDIKATOR KELAS</span><h2>Perlu perhatian</h2></div><AlertTriangle /></div>
          <div className="admin-weakest-value"><strong>{weakest.value}%</strong><span>{weakest.label}</span></div>
          <div className="admin-progress"><span style={{ width: `${weakest.value}%` }} /></div>
          <p>{weakest.value >= 75 ? 'Semua indikator utama sudah mencapai target 75%.' : `Indikator ini masih di bawah target 75%. Prioritaskan latihan ${weakest.label.toLowerCase()}.`}</p>
        </article>
      </section>
    </>
  )
}
