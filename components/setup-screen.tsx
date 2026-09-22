import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CalendarClock, Dices, RefreshCw } from 'lucide-react'
import { Player } from '@/lib/game-data'

type SetupScreenProps = {
  onStart: (context: { players: Player[]; goal: string; roomCode: string; roomId: string; sessionId: string }) => Promise<void>
}

const PLAYER_COLORS: ('blue' | 'green' | 'yellow' | 'red')[] = ['blue', 'green', 'yellow', 'red']

export function SetupScreen({ onStart }: SetupScreenProps) {
  type AvailableExam = { id:string; name:string; learning_goal:string|null; starts_at:string; ends_at:string; duration_minutes:number; question_time_seconds:number|null; status:'scheduled'|'active'; availability:'available'|'upcoming'; is_available:boolean }
  const [exams, setExams] = useState<AvailableExam[]>([])
  const [examId, setExamId] = useState('')
  const [loadingExams, setLoadingExams] = useState(true)
  const [examError, setExamError] = useState('')
  const [playerCount, setPlayerCount] = useState<number>(2)
  const [goal, setGoal] = useState('')
  const [names, setNames] = useState<string[]>(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [studentCodes, setStudentCodes] = useState<string[]>(['', '', '', ''])
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')

  const loadExams = useCallback(async () => {
    setLoadingExams(true)
    setExamError('')
    try {
      const response = await fetch('/api/exams/active', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Daftar ujian gagal dimuat')
      const nextExams: AvailableExam[] = result.data || []
      const available = nextExams.filter(exam => exam.is_available)
      setExams(nextExams)
      setExamId(current => available.some(exam => exam.id === current) ? current : available.length === 1 ? available[0].id : '')
      if (available.length === 1 && available[0].learning_goal) setGoal(available[0].learning_goal)
    } catch (loadError) {
      setExams([])
      setExamError(loadError instanceof Error ? loadError.message : 'Daftar ujian gagal dimuat')
    } finally {
      setLoadingExams(false)
    }
  }, [])

  useEffect(() => { void loadExams() }, [loadExams])

  const handleExamChange = (value: string) => {
    setExamId(value)
    const selected = exams.find(exam => exam.id === value)
    if (selected?.learning_goal) setGoal(selected.learning_goal)
  }

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names]
    newNames[index] = value
    setNames(newNames)
  }

  const handleStudentCodeChange = (index: number, value: string) => {
    const newStudentCodes = [...studentCodes]
    newStudentCodes[index] = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30)
    setStudentCodes(newStudentCodes)
  }

  const handleStart = async () => {
    const newPlayers: Player[] = Array.from({ length: playerCount }).map((_, index) => ({
      studentCode: studentCodes[index].trim(),
      name: names[index] || `Pemain ${index + 1}`,
      color: PLAYER_COLORS[index],
      score: 0,
      xp: 0,
      level: 1,
      avatar: (names[index] || `P${index + 1}`)[0].toUpperCase(),
      active: index === 0,
    }))

    const activeCodes = studentCodes.slice(0, playerCount).map((code) => code.trim())
    if (activeCodes.some((code) => !/^[A-Z0-9_-]{3,30}$/.test(code))) {
      setError('Kode siswa setiap pemain wajib diisi, minimal 3 karakter.')
      return
    }
    if (new Set(activeCodes).size !== activeCodes.length) {
      setError('Kode siswa harus berbeda untuk setiap pemain.')
      return
    }
    
    setIsStarting(true)
    setError('')

    try {
      const response = await fetch('/api/rooms/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: newPlayers, goal, examId: examId || null }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Tidak dapat membuat room permainan')
      }

      window.localStorage.setItem(
        'ludo-kpk-session',
        JSON.stringify({
          roomCode: result.roomCode,
          roomId: result.roomId,
          sessionId: result.sessionId,
        })
      )
      await onStart({ players: result.players, goal, roomCode: result.roomCode, roomId: result.roomId, sessionId: result.sessionId })
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Koneksi database belum dapat digunakan'
      )
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-header-icon"><Dices /></div>
          <div>
            <p className="eyebrow">GAME LOKAL MATEMATIKA KELAS V</p>
            <h1>Petualangan Seru Melalui Ludo</h1>
            <p className="setup-subtitle">Mainkan bergiliran pada satu perangkat, gunakan strategi Ludo klasik, dan bawa empat pion menuju pusat kemenangan.</p>
          </div>
        </div>

        <div className="setup-content">
          <div className="setup-form">
            <div className="form-group">
              <div className="setup-exam-label">
                <label htmlFor="active-exam">Pilih ujian</label>
                <button type="button" onClick={() => void loadExams()} disabled={loadingExams} aria-label="Muat ulang daftar ujian"><RefreshCw size={14} className={loadingExams ? 'spinning' : ''}/> Muat ulang</button>
              </div>
              <select id="active-exam" className="setup-input" value={examId} onChange={event => handleExamChange(event.target.value)} disabled={loadingExams}>
                <option value="">Permainan latihan (30 menit)</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id} disabled={!exam.is_available}>
                    {exam.name} · {exam.duration_minutes} menit{exam.is_available ? ' · tersedia' : ` · mulai ${new Date(exam.starts_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}`}
                  </option>
                ))}
              </select>
              {loadingExams && <small>Memuat ujian dari database...</small>}
              {!loadingExams && examError && <div className="setup-exam-message error"><span>{examError}</span><button type="button" onClick={() => void loadExams()}>Coba lagi</button></div>}
              {!loadingExams && !examError && exams.length === 0 && <small>Belum ada ujian yang aktif atau terjadwal.</small>}
              {!loadingExams && !examError && exams.length > 0 && exams.every(exam => !exam.is_available) && <small>Ada {exams.length} ujian terjadwal, tetapi belum memasuki waktu mulai.</small>}
              {examId && (() => {
                const selected = exams.find(exam => exam.id === examId)
                return selected ? <div className="setup-exam-info"><CalendarClock size={15}/><span><strong>{selected.name}</strong><small>Berakhir {new Date(selected.ends_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}{selected.question_time_seconds ? ` · ${selected.question_time_seconds} detik/soal` : ''}</small></span></div> : null
              })()}
            </div>
            <div className="form-group">
              <label>Tujuan pembelajaran</label>
              <input 
                type="text" 
                placeholder="Misal: Memahami konsep KPK" 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="setup-input"
              />
            </div>

            <div className="form-group">
              <label>Berapa pemain yang ikut?</label>
              <div className="player-count-buttons">
                {[2, 3, 4].map(num => (
                  <button 
                    key={num}
                    className={`count-btn ${playerCount === num ? 'active' : ''}`}
                    onClick={() => setPlayerCount(num)}
                  >
                    {num} Pemain
                  </button>
                ))}
              </div>
            </div>

            <div className="names-grid">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div className="form-group" key={i}>
                  <label>Nama Pemain {i + 1}</label>
                  <input 
                    type="text" 
                    value={names[i]}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    className="setup-input"
                  />
                  <label htmlFor={`student-code-${i}`}>NIS / Kode Siswa {i + 1}</label>
                  <input
                    id={`student-code-${i}`}
                    type="text"
                    value={studentCodes[i]}
                    onChange={(event) => handleStudentCodeChange(i, event.target.value)}
                    className="setup-input"
                    placeholder="Contoh: 5A-001"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                </div>
              ))}
            </div>
            
            {error && <p className="setup-error" role="alert">{error}</p>}
            <button className="start-game-btn" onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Menghubungkan ke database...' : 'Mulai Permainan Ludo!'}
            </button>
          </div>

          <div className="setup-guide">
            <div className="guide-header">
              <BookOpen size={18} />
              <h3>Cara Bermain</h3>
            </div>
            <ul className="guide-list">
              <li>Lempar dadu untuk mendapatkan angka langkah.</li>
              <li>Jawab soal KPK yang muncul. Jika benar, pionmu maju.</li>
              <li>Gerakkan pion sesuai angka pada dadu.</li>
              <li>Manfaatkan kotak aman agar pion terlindungi.</li>
              <li>Bawa semua pion ke pusat kemenangan.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
