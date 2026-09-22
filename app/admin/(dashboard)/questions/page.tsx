import { Suspense } from 'react'
import { QuestionTable } from '@/components/admin/question-table'

export default function QuestionsPage() {
  return (
    <>
      <header className="admin-page-heading"><div><span className="admin-kicker">KONTEN PEMBELAJARAN</span><h1>Bank Soal KPK</h1><p>Kelola soal cerita, pilihan jawaban, dan pembahasan metode Polya.</p></div></header>
      <section className="admin-panel admin-table-panel">
        <Suspense fallback={<div className="admin-empty">Memuat bank soal…</div>}>
          <QuestionTable />
        </Suspense>
      </section>
    </>
  )
}
