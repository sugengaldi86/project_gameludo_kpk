'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowDownAZ, CalendarDays, Download, Search, Users } from 'lucide-react'
import type { RoomFilter, StudentReport } from '@/lib/admin-types'
import { exportStudentReportsToExcel } from '@/lib/excel-export'

type SortKey = keyof Pick<StudentReport, 'name' | 'sessionCount' | 'questionCount' | 'accuracy' | 'strategyAccuracy' | 'kpkAccuracy' | 'verificationAccuracy'>
type Summary = { students: number; answers: number; averageAccuracy: number; belowTarget: number }

function Score({ value }: { value: number }) {
  return <span className={`admin-score ${value >= 75 ? 'achieved' : 'needs-work'}`}>{value}% <b>{value >= 75 ? '✓' : '!'}</b></span>
}

export function StudentReportTable() {
  const [reports, setReports] = useState<StudentReport[]>([])
  const [rooms, setRooms] = useState<RoomFilter[]>([])
  const [summary, setSummary] = useState<Summary>({ students: 0, answers: 0, averageAccuracy: 0, belowTarget: 0 })
  const [room, setRoom] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('accuracy')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (room) params.set('room', room)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    try {
      const response = await fetch(`/api/admin/reports/students?${params}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Gagal memuat rekap')
      setReports(result.data)
      setRooms(result.rooms)
      setSummary(result.summary)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat rekap')
    } finally {
      setLoading(false)
    }
  }, [room, from, to])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReports(), 0)
    return () => window.clearTimeout(timer)
  }, [loadReports])

  const visibleReports = useMemo(() => reports
    .filter((report) => report.name.toLowerCase().includes(search.toLowerCase()))
    .sort((first, second) => {
      const a = first[sortKey]
      const b = second[sortKey]
      const comparison = typeof a === 'string' ? a.localeCompare(String(b), 'id') : Number(a) - Number(b)
      return sortDirection === 'asc' ? comparison : -comparison
    }), [reports, search, sortKey, sortDirection])

  function sortBy(key: SortKey) {
    if (key === sortKey) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
  }

  function exportExcel() {
    const exportedAnswers = visibleReports.reduce((total, report) => total + report.questionCount, 0)
    const exportedCorrect = visibleReports.reduce((total, report) => total + report.correctCount, 0)
    const exportSummary: Summary = {
      students: visibleReports.length,
      answers: exportedAnswers,
      averageAccuracy: exportedAnswers ? Math.round((exportedCorrect / exportedAnswers) * 100) : 0,
      belowTarget: visibleReports.filter((report) => report.questionCount > 0 && report.accuracy < 75).length,
    }
    exportStudentReportsToExcel({
      reports: visibleReports,
      summary: exportSummary,
      rooms,
      roomId: room,
      from,
      to,
    })
  }

  return (
    <>
      <section className="admin-report-summary">
        <article><Users /><span><strong>{summary.students}</strong>Murid tercatat</span></article>
        <article><ArrowDownAZ /><span><strong>{summary.answers}</strong>Jawaban terkumpul</span></article>
        <article><span className="summary-percent">{summary.averageAccuracy}%</span><span><strong>Akurasi kelas</strong>Target minimal 75%</span></article>
        <article className="warning"><AlertTriangle /><span><strong>{summary.belowTarget}</strong>Murid perlu latihan</span></article>
      </section>
      <section className="admin-panel admin-table-panel">
        <div className="admin-toolbar report-toolbar">
          <div className="admin-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama murid..." /></div>
          <select value={room} onChange={(event) => setRoom(event.target.value)} aria-label="Filter room"><option value="">Semua room</option>{rooms.map((item) => <option key={item.id} value={item.id}>{item.room_code}</option>)}</select>
          <label className="admin-date-filter"><CalendarDays /><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Tanggal mulai" /></label>
          <label className="admin-date-filter"><span>s/d</span><input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} aria-label="Tanggal akhir" /></label>
          <button className="admin-secondary-button" onClick={exportExcel} disabled={!visibleReports.length}><Download /> Rekap Excel</button>
        </div>
        {error && <div className="admin-alert error">{error}</div>}
        <div className="admin-table-wrap">
          <table className="admin-table report-table">
            <thead><tr><th><button onClick={() => sortBy('name')}>Nama</button></th><th><button onClick={() => sortBy('sessionCount')}>Sesi</button></th><th><button onClick={() => sortBy('questionCount')}>Soal</button></th><th><button onClick={() => sortBy('accuracy')}>Akurasi</button></th><th>Informasi</th><th><button onClick={() => sortBy('strategyAccuracy')}>Strategi</button></th><th><button onClick={() => sortBy('kpkAccuracy')}>Hitung</button></th><th><button onClick={() => sortBy('verificationAccuracy')}>Cek</button></th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={8} className="admin-empty">Menghitung rekap nilai...</td></tr> : visibleReports.length === 0 ? <tr><td colSpan={8} className="admin-empty">Belum ada data murid untuk filter ini.</td></tr> : visibleReports.map((report) => <tr key={report.playerId}><td><Link className="admin-student-name" href={`/admin/reports/${report.playerId}`}><span>{report.name.charAt(0).toUpperCase()}</span><div><strong>{report.name}</strong><small>Pretest {report.pretestScore}% · Lihat detail</small></div></Link></td><td>{report.sessionCount}</td><td>{report.questionCount}</td><td><Score value={report.accuracy} /></td><td><Score value={report.informationAccuracy} /></td><td><Score value={report.strategyAccuracy} /></td><td><Score value={report.kpkAccuracy} /></td><td><Score value={report.verificationAccuracy} /></td></tr>)}</tbody>
          </table>
        </div>
        <div className="admin-table-footer"><span>{visibleReports.length} murid ditampilkan</span><span>✓ Tercapai ≥75% · ! Perlu latihan &lt;75%</span></div>
      </section>
    </>
  )
}
