import { StudentReportTable } from '@/components/admin/student-report-table'

export default function ReportsPage() {
  return <><header className="admin-page-heading"><div><span className="admin-kicker">ANALISIS PEMBELAJARAN</span><h1>Rekap Nilai Siswa</h1><p>Pantau ketercapaian tujuan belajar setiap murid dengan target minimal 75%.</p></div></header><StudentReportTable /></>
}
