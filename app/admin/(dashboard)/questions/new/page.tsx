import { Suspense } from 'react'
import { QuestionForm } from '@/components/admin/question-form'

export default function NewQuestionPage() {
  return (
    <>
      <header className="admin-page-heading"><div><span className="admin-kicker">BANK SOAL</span><h1>Tambah Soal Baru</h1><p>Lengkapi cerita, pilihan jawaban, dan pembahasan berbasis Polya.</p></div></header>
      <Suspense fallback={<div className="admin-empty">Memuat form…</div>}>
        <QuestionForm />
      </Suspense>
    </>
  )
}
