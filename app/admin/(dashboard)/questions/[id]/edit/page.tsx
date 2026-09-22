import { QuestionForm } from '@/components/admin/question-form'

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <><header className="admin-page-heading"><div><span className="admin-kicker">BANK SOAL</span><h1>Ubah Soal</h1><p>Perbarui isi soal tanpa menghilangkan riwayat jawaban murid.</p></div></header><QuestionForm questionId={id} /></>
}
