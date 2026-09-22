'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BookOpen, ChevronRight, CircleHelp, Dices, Gem, LogOut, Medal, MoreHorizontal, Settings, Shield, Sparkles, Star, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { GameBoard } from '@/components/game-board'
import { GameNavigation } from '@/components/game-navigation'
import { DicePanel } from '@/components/dice-panel'
import { QuestionModal } from '@/components/question-modal'
import { SetupScreen } from '@/components/setup-screen'
import { type NavItem, type Player, type Question } from '@/lib/game-data'
import { initializePawns, PawnState } from '@/lib/pawn-logic'

export default function Page() {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup')
  const [gamePlayers, setGamePlayers] = useState<Player[]>([])
  const [learningGoal, setLearningGoal] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [turnNumber, setTurnNumber] = useState(1)
  const [sessionStatus, setSessionStatus] = useState('TURN_START')
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState<number | null>(null)
  const [winnerDismissed, setWinnerDismissed] = useState(false)

  const [pawns, setPawns] = useState<PawnState[]>(initializePawns())
  const [canMovePawn, setCanMovePawn] = useState(false)

  const [dice, setDice] = useState(4)
  const [rolling, setRolling] = useState(false)
  const [notice, setNotice] = useState('Giliranmu!')
  const [questionOpen, setQuestionOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [correctOption, setCorrectOption] = useState<string | null>(null)
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null)
  const [explanation, setExplanation] = useState<Parameters<typeof QuestionModal>[0]['explanation']>(null)
  const [muted, setMuted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeNav, setActiveNav] = useState('Game')
  const [streak, setStreak] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState(0)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)
  const [answerTurnAdvanced, setAnswerTurnAdvanced] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [savedRoomCode, setSavedRoomCode] = useState<string | null>(null)
  const [restoringSession, setRestoringSession] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  // Ref untuk mencegah pengiriman jawaban ganda secara bersamaan
  const isSubmittingAnswer = useRef(false)

  async function refreshGame(code: string): Promise<Player[]> {
    const response = await fetch(`/api/game/${code}`, { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'State permainan gagal dimuat')
    if (result.session.status === 'TURN_END') {
      const turnResponse = await fetch(`/api/game/${code}/turn`, { method: 'POST' })
      const turnResult = await turnResponse.json()
      if (!turnResponse.ok) throw new Error(turnResult.error || 'Giliran tertunda gagal dipulihkan')
      return refreshGame(code)
    }
    const players: Player[] = result.players.map((player: { player_id: string; display_name: string; color: Player['color']; score: number; xp_earned: number; correct_answers: number; streak: number; profiles: { level: number; total_xp: number; total_score: number } | Array<{ level: number; total_xp: number; total_score: number }> | null }) => {
      const profile = Array.isArray(player.profiles) ? player.profiles[0] : player.profiles
      return { id: player.player_id, name: player.display_name, color: player.color, score: player.score, xp: player.xp_earned,
        totalXp: profile?.total_xp || 0, totalScore: profile?.total_score || 0,
        level: profile?.level || 1, avatar: player.display_name.charAt(0).toUpperCase(), active: player.player_id === result.session.current_player_id }
    })
    setGamePlayers(players)
    setTurnNumber(result.session.current_turn_number)
    setSessionStatus(result.session.status)
    setWinnerId(result.session.winner_player_id || null)
    setLearningGoal(result.room.learning_goal || '')
    setEndTime(result.room.end_time || null)
    const roomExam = Array.isArray(result.room.exams) ? result.room.exams[0] : result.room.exams
    setQuestionTimeSeconds(roomExam?.question_time_seconds || null)
    const activeDatabasePlayer = result.players.find((player: { player_id: string }) => player.player_id === result.session.current_player_id)
    setStreak(activeDatabasePlayer?.streak || 0)
    setCorrectAnswers(activeDatabasePlayer?.correct_answers || 0)
    setWrongAnswers(activeDatabasePlayer?.wrong_answers || 0)
    setDice(result.session.current_dice_value || 1)
    setPawns(result.pawns.map((pawn: { id: string; player_id: string; pawn_number: number; status: PawnState['status']; position: number | null }) => ({
      id: pawn.id, color: players.find((player) => player.id === pawn.player_id)?.color || 'blue', pawnNumber: pawn.pawn_number - 1,
      status: pawn.status, position: pawn.position ?? pawn.pawn_number - 1,
    })))
    if (result.session.status === 'QUIZ' && result.activeQuestion) {
      setCurrentQuestion(result.activeQuestion)
      setSelectedAnswer(null)
      setFeedback('')
      setQuestionOpen(true)
      setCanMovePawn(false)
    } else if (result.session.status === 'PAWN_SELECTION') {
      setQuestionOpen(false)
      setCanMovePawn(true)
    } else {
      setQuestionOpen(false)
      setCanMovePawn(false)
    }
    return players
  }

  const handleStartGame = async (context: { players: Player[]; goal: string; roomCode: string; roomId: string; sessionId: string }) => {
    setGamePlayers(context.players)
    setLearningGoal(context.goal)
    setRoomCode(context.roomCode)
    const players = await refreshGame(context.roomCode)
    setNotice(`Giliran ${players.find((player) => player.active)?.name || 'Pemain 1'}!`)
    setGameState('playing')
  }

  useEffect(() => {
    const stored = window.localStorage.getItem('ludo-kpk-session')
    if (!stored) return
    try {
      const session = JSON.parse(stored) as { roomCode?: string }
      if (!session.roomCode) return
      const timer = window.setTimeout(() => setSavedRoomCode(session.roomCode!), 0)
      return () => window.clearTimeout(timer)
    } catch {
      window.localStorage.removeItem('ludo-kpk-session')
    }
  }, [])

  async function resumeSavedGame() {
    if (!savedRoomCode || restoringSession) return
    setRestoringSession(true)
    setRecoveryError('')
    try {
      const players = await refreshGame(savedRoomCode)
      setRoomCode(savedRoomCode)
      setNotice(`Giliran ${players.find((player) => player.active)?.name || 'Pemain'}!`)
      setSavedRoomCode(null)
      setGameState('playing')
    } catch (error) {
      window.localStorage.removeItem('ludo-kpk-session')
      setSavedRoomCode(null)
      setRecoveryError(error instanceof Error ? error.message : 'Game lama tidak dapat dipulihkan')
    } finally {
      setRestoringSession(false)
    }
  }

  async function discardSavedGame() {
    if (!savedRoomCode || restoringSession) return
    setRestoringSession(true)
    setRecoveryError('')
    try {
      const response = await fetch(`/api/game/${savedRoomCode}/leave`, { method: 'POST' })
      if (!response.ok && response.status !== 401) {
        const result = await response.json()
        throw new Error(result.error || 'Game lama gagal diakhiri')
      }
      window.localStorage.removeItem('ludo-kpk-session')
      setSavedRoomCode(null)
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'Game lama gagal diakhiri')
    } finally {
      setRestoringSession(false)
    }
  }

  const [timeLeft, setTimeLeft] = useState<string>('00:00')
  const [timerSeconds, setTimerSeconds] = useState<number>(Infinity)

  useEffect(() => {
    if (!endTime) return
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = new Date(endTime).getTime() - now
      
      if (distance <= 0) {
        clearInterval(interval)
        setTimeLeft('00:00')
        setTimerSeconds(0)
        // Akhiri permainan jika waktu habis dan game belum game over
        if (sessionStatus !== 'GAME_OVER') {
          fetch(`/api/game/${roomCode}/end`, { method: 'POST' }).then(() => refreshGame(roomCode))
        }
      } else {
        const totalSec = Math.ceil(distance / 1000)
        const minutes = Math.floor(totalSec / 60)
        const seconds = totalSec % 60
        setTimerSeconds(totalSec)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime, sessionStatus, roomCode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !questionOpen && !canMovePawn) rollDice()
      if (event.key === 'Escape' && selectedAnswer) setQuestionOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function rollDice() {
    if (rolling || questionOpen || canMovePawn || sessionStatus !== 'TURN_START') return
    setRolling(true)
    setQuestionOpen(false)
    setSelectedAnswer(null)
    setAnswerTurnAdvanced(false)
    setCorrectOption(null)
    setExplanation(null)
    setFeedback('')
    setNotice('Mengocok dadu...')

    let ticks = 0
    const animation = window.setInterval(() => {
      ticks += 1
      setDice(Math.floor(Math.random() * 6) + 1)
      if (ticks >= 8) {
        window.clearInterval(animation)
        fetch(`/api/game/${roomCode}/roll`, { method: 'POST' }).then(async (response) => {
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Dadu gagal dilempar')
          setDice(result.diceValue)
          playFeedbackSound(440)
          setRolling(false)
          setSessionStatus(result.nextStatus)
          
          if (result.canMovePawn) {
            setCanMovePawn(true)
            setNotice('Dadu berhenti! Klik pada pionmu di papan untuk maju.')
          } else {
            // Pion tidak bisa jalan, tapi tetap tampilkan soal
            setSessionStatus('QUIZ')
            if (result.question) {
              setCurrentQuestion(result.question)
              setNotice('Pion belum bisa keluar. Jawab soal untuk mendapatkan poin!')
              window.setTimeout(() => setQuestionOpen(true), 500)
            } else {
              setNotice('Pion belum bisa keluar dari rumah. Giliran berpindah.')
              setAnswerTurnAdvanced(true)
              setTimeout(() => refreshGame(roomCode), 1000)
            }
          }
        }).catch((error) => { setRolling(false); setNotice(error instanceof Error ? error.message : 'Dadu gagal dilempar') })
      }
    }, 100)
  }

  const answerQuestion = useCallback(async (answer: string | null) => {
    // Guard: jika sedang memproses jawaban atau sudah ada jawaban, abaikan
    if (!currentQuestion || selectedAnswer || isSubmittingAnswer.current) return
    isSubmittingAnswer.current = true
    const submittedAnswer = answer || '__TIMEOUT__'
    setSelectedAnswer(submittedAnswer)
    try {
      const response = await fetch(`/api/game/${roomCode}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, selectedOption: submittedAnswer }) })
      const result = await response.json()

      // 410 = waktu game habis (bukan race condition)
      if (response.status === 410) {
        setNotice(result.error || 'Waktu ujian telah habis.')
        setSessionStatus('GAME_OVER')
        return
      }

      // Jika jawaban sudah diproses / race condition → abaikan senyap
      if (result.alreadyAnswered || !response.ok) return

      setCorrectOption(result.correctOption)
      setIsAnswerCorrect(result.isCorrect)
      setExplanation(result.explanation)
      setAnswerTurnAdvanced(Boolean(result.turnAdvanced))
      if (result.isCorrect) {
        playFeedbackSound(660)
        setFeedback(`Benar! Kamu mendapatkan ${result.scoreAwarded} poin.`)
        setCorrectAnswers((value) => value + 1)
        setStreak((value) => value + 1)
        setNotice('Jawaban benar! Giliran pemain selanjutnya.')
      } else {
        playFeedbackSound(220)
        setFeedback('Belum tepat. Kamu tidak mendapatkan poin.')
        setStreak(0)
        setWrongAnswers((value) => value + 1)
        setNotice('Jawaban belum tepat. Giliran pemain selanjutnya.')
      }
      setSessionStatus('TURN_END')
    } catch (error) {
      setSelectedAnswer(null)
      setFeedback('')
      setNotice(error instanceof Error ? error.message : 'Jawaban gagal disimpan. Silakan coba lagi.')
    } finally {
      isSubmittingAnswer.current = false
    }
  }, [currentQuestion, selectedAnswer, roomCode])


  async function handlePawnClick(pawnId: string) {
    if (!canMovePawn) return
    try {
      const response = await fetch(`/api/game/${roomCode}/pawn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pawnId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Pion tidak dapat digerakkan')
      setCanMovePawn(false)
      setSessionStatus(result.nextStatus)
      if (result.question) {
        setCurrentQuestion(result.question)
        setNotice('Pion mendarat! Jawab soal untuk mendapatkan poin.')
        window.setTimeout(() => setQuestionOpen(true), 350)
      } else if (result.finished) {
        setNotice('Pion mencapai garis akhir!')
      }
      refreshGame(roomCode)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Pion gagal digerakkan. Coba lagi.')
    }
  }

  async function continueAfterAnswer() {
    setQuestionOpen(false)
    if (canMovePawn) {
      // Jawaban benar - beri tahu pemain untuk klik pion
      setNotice('🎯 Klik pion kamu di papan untuk maju!')
    } else if (answerTurnAdvanced) {
      try {
        const players = await refreshGame(roomCode)
        const currentName = players.find((player) => player.active)?.name || 'pemain berikutnya'
        setNotice(`Pemain berganti! Sekarang giliran ${currentName} melempar dadu.`)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Giliran berikutnya gagal dimuat')
      }
    }
    
    // Clear states
    setSelectedAnswer(null)
    setFeedback('')
    setIsAnswerCorrect(null)
    setCurrentQuestion(null)
    setCorrectOption(null)
    setExplanation(null)
  }

  async function leaveGame() {
    const confirmed = window.confirm('Akhiri game ini? Progres tetap tersimpan, tetapi game tidak dapat dilanjutkan dan tidak memiliki pemenang.')
    if (!confirmed) return
    setLeaving(true)
    try {
      const response = await fetch(`/api/game/${roomCode}/leave`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok && response.status !== 401) throw new Error(result.error || 'Game gagal diakhiri')
      window.localStorage.removeItem('ludo-kpk-session')
      window.location.assign('/')
    } catch (error) {
      setLeaving(false)
      setNotice(error instanceof Error ? error.message : 'Game gagal diakhiri')
    }
  }

  async function copyRoom() {
    await navigator.clipboard?.writeText(roomCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  function chooseNav(label: string) {
    setActiveNav(label)
    setActiveDialog(label === 'Game' ? null : label)
    if (label !== 'Game') setNotice(`${label} dibuka untukmu!`)
  }

  function openDialog(label: string) {
    setActiveDialog(label)
  }

  function closeDialog() {
    setActiveDialog(null)
  }

  function playFeedbackSound(frequency: number) {
    if (muted) return
    const AudioContextClass = window.AudioContext
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.05, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)
    oscillator.addEventListener('ended', () => void context.close(), { once: true })
  }

  if (gameState === 'setup') {
    return <>
      <SetupScreen onStart={handleStartGame} />
      {savedRoomCode && <div className="question-overlay" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <div className="question-modal session-recovery-modal">
          <div className="question-icon"><Dices /></div>
          <h2 id="recovery-title">Game sebelumnya ditemukan</h2>
          <p>Room <strong>{savedRoomCode}</strong> masih aktif. Pilih lanjutkan untuk kembali ke tahap terakhir, atau akhiri agar dapat membuat game baru.</p>
          {recoveryError && <p className="setup-error" role="alert">{recoveryError}</p>}
          <div className="session-recovery-actions">
            <button className="roll-button" onClick={resumeSavedGame} disabled={restoringSession}>{restoringSession ? 'Memproses...' : 'Lanjutkan game'}</button>
            <button className="leave-session-button" onClick={discardSavedGame} disabled={restoringSession}><LogOut /> Akhiri game lama</button>
          </div>
        </div>
      </div>}
      {!savedRoomCode && recoveryError && <p className="setup-error recovery-page-error" role="alert">{recoveryError}</p>}
    </>
  }

  const activePlayer = gamePlayers.find((player) => player.active) || gamePlayers[0]
  const rankedPlayers = [...gamePlayers].sort((first, second) => second.score - first.score)
  const winner = gamePlayers.find((player) => player.id === winnerId)
  const activeRank = activePlayer ? rankedPlayers.findIndex((player) => player.id === activePlayer.id) + 1 : 0
  const activeAccuracy = correctAnswers + wrongAnswers
    ? Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * 100)
    : 0

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Dices /></div><div><p className="brand-name">LUDO <span>KPK</span></p><p className="brand-subtitle">Arena belajar matematika</p></div></div>
        <div className="room-pill"><span className="live-dot" /> ROOM <strong>{roomCode}</strong><button aria-label="Salin kode room" onClick={copyRoom}>{copied ? 'Tersalin' : <MoreHorizontal />}</button></div>
        {endTime && (
          <div className={`exam-timer-pill${timerSeconds <= 60 ? ' critical' : timerSeconds <= 300 ? ' danger' : timerSeconds <= 600 ? ' warning' : ''}`}>
            ⏱ {timeLeft}
          </div>
        )}
        <div className="top-actions"><div className="level-progress"><div className="level-row"><span>Level {activePlayer?.level || 1}</span><strong>{activePlayer?.totalXp || 0} XP</strong></div><div className="progress-track"><div style={{ width: `${Math.min((activePlayer?.totalXp || 0) % 100, 100)}%` }} /></div></div><button className="icon-button" aria-label="Notifikasi" onClick={() => openDialog('Notifikasi')}><Bell /></button><button className="icon-button" aria-label="Pengaturan" onClick={() => openDialog('Pengaturan')}><Settings /></button><div className="profile-avatar">{activePlayer?.avatar || 'P'}</div></div>
      </header>

      <div className="game-layout">
        <aside className="left-panel">
          <div className="section-heading"><div><p className="eyebrow">ROOM {roomCode}</p><h2>Pemain</h2></div><span className="player-count">{gamePlayers.length}/{gamePlayers.length}</span></div>
          <div className="player-list">
            {gamePlayers.map((player) => <div className={`player-card ${player.active ? 'is-active' : ''}`} key={player.id || player.name}><div className={`player-avatar avatar-${player.color}`}>{player.avatar}</div><div className="player-copy"><div className="player-name-row"><strong>{player.name}</strong>{player.active && <span className="you-tag">GILIRAN</span>}</div><span className="player-status">{player.active ? 'Sedang bermain' : `Level ${player.level}`}</span></div><strong className="player-score">{player.score}</strong></div>)}
          </div>
          <div className="turn-card"><div className="turn-icon"><Zap /></div><div><span className="eyebrow">GILIRAN SEKARANG</span><strong>{notice}</strong></div></div>
          <button className="how-card" onClick={() => openDialog('Cara bermain')}><div className="how-icon"><CircleHelp /></div><div><strong>Butuh bantuan?</strong><p>Lihat cara bermain</p></div><ChevronRight /></button>
        </aside>

        <section className="board-section">
          <div className="board-heading"><div><p className="eyebrow">MODE KLASIK · GILIRAN {turnNumber}</p><h1>{learningGoal || 'Waktunya menaklukkan KPK!'}</h1></div><div className="streak-badge"><Sparkles /> <span>Streak <strong>{streak}</strong></span></div></div>
          <div className="board-stage">
            <GameBoard
              dice={dice}
              rolling={rolling}
              activePawnColor={canMovePawn ? gamePlayers.find(p => p.active)?.color : undefined}
              pawns={pawns}
              onPawnClick={handlePawnClick}
            />
            <div className="board-legend"><span><i className="legend-dot legend-safe" /> Safe zone</span><span><Shield /> Pion aman dari tangkapan</span></div>
          </div>
          {sessionStatus === 'GAME_OVER' && <div className="turn-card"><div className="turn-icon"><Trophy /></div><div><span className="eyebrow">PERMAINAN SELESAI</span><strong>{winner?.name || 'Pemain'} menjadi pemenang!</strong></div></div>}
          <DicePanel dice={dice} rolling={rolling} disabled={sessionStatus !== 'TURN_START'} onRoll={rollDice} />
        </section>

        <aside className="right-panel">
          <div className="panel-card leaderboard-card"><div className="card-heading"><div><p className="eyebrow">PERINGKAT ROOM</p><h2>Leaderboard</h2></div><Trophy className="heading-icon" /></div><div className="leaderboard-list">{rankedPlayers.map((player, index) => <div className="leader-row" key={player.name}><span className={`rank rank-${index + 1}`}>{index + 1}</span><div className={`mini-avatar avatar-${player.color}`}>{player.avatar}</div><strong>{player.name}</strong><span className="leader-score">{player.score}<small> pts</small></span></div>)}</div><button className="text-button" onClick={() => openDialog('Rank')}>Lihat semua peringkat <ChevronRight /></button></div>
          <div className="panel-card mission-card"><div className="card-heading"><div><p className="eyebrow">ROOM INI</p><h2>Target belajar</h2></div><Gem className="heading-icon gold" /></div><div className="mission-item"><div className="mission-icon purple"><Star /></div><div className="mission-copy"><strong>Jawab 5 soal benar</strong><div className="mission-progress"><span style={{ width: `${Math.min(correctAnswers / 5 * 100, 100)}%` }} /></div><small>{Math.min(correctAnswers, 5)} / 5 selesai</small></div><span className={`reward ${correctAnswers >= 5 ? 'done' : ''}`}>{correctAnswers >= 5 ? 'Tercapai' : 'Berjalan'}</span></div><div className="mission-item"><div className="mission-icon orange"><Medal /></div><div className="mission-copy"><strong>Streak 3 jawaban</strong><div className="mission-progress"><span style={{ width: `${Math.min(streak / 3 * 100, 100)}%` }} /></div><small>{streak >= 3 ? 'Tercapai!' : `${streak} / 3`}</small></div><span className={`reward ${streak >= 3 ? 'done' : ''}`}>{streak >= 3 ? 'Selesai' : 'Berjalan'}</span></div></div>
          <div className="coach-card"><div className="coach-orb"><BookOpen /></div><div><strong>Progres KPK</strong><p>Akurasi giliran aktif: {correctAnswers + wrongAnswers ? Math.round(correctAnswers / (correctAnswers + wrongAnswers) * 100) : 0}%.</p></div></div>
        </aside>
      </div>

      <GameNavigation activeNav={activeNav as NavItem} onNavigate={chooseNav} />
      <button className="sound-toggle" aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX /> : <Volume2 />}</button>
      <button className="leave-game-button" onClick={leaveGame} disabled={leaving}><LogOut /> {leaving ? 'Mengakhiri...' : 'Keluar game'}</button>
      
      {(sessionStatus === 'GAME_OVER' || winnerId) && !winnerDismissed && (
        <div className="question-overlay" role="dialog" aria-modal="true" aria-labelledby="winner-title">
          <div className="question-modal feature-modal feature-winner" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div className="feature-hero rank-hero" style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
              <Trophy size={40} />
            </div>
            <h2 id="winner-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Selamat!</h2>
            <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              <strong>{winner?.name || 'Pemain'}</strong> telah memenangkan permainan!
            </p>
            <div style={{ background: 'var(--surface-color, #f8fafc)', padding: '1rem', borderRadius: '1rem', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skor Akhir</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color, #2563eb)' }}>{winner?.score || 0}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
              <button className="roll-button dialog-action" onClick={() => setWinnerDismissed(true)} style={{ width: '100%', background: 'var(--surface-color, #f8fafc)', color: 'var(--text-color, #0f172a)' }}>
                Tutup & Lihat Papan
              </button>
              <button className="roll-button dialog-action" onClick={leaveGame} disabled={leaving} style={{ width: '100%' }}>
                {leaving ? 'Keluar...' : 'Selesai & Keluar Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDialog && (
        <div className="question-overlay" role="dialog" aria-modal="true" aria-labelledby="feature-title">
          <div className={`question-modal feature-modal feature-${activeDialog.toLowerCase().replaceAll(' ', '-')}`}>
            <div className="question-topline"><span className="eyebrow">LUDO KPK · PANEL PEMAIN</span><button className="close-question" onClick={closeDialog} aria-label="Tutup"><X /></button></div>
            {activeDialog === 'Rank' && <><div className="feature-hero rank-hero"><Trophy /><div><strong>Peringkat room</strong><small>Diurutkan dari skor permainan saat ini.</small></div></div><h2 id="feature-title">Leaderboard Room</h2><div className="feature-stat-grid"><div><strong>{activePlayer?.score || 0}</strong><small>Poin pemain aktif</small></div><div><strong>{turnNumber}</strong><small>Nomor giliran</small></div><div><strong>#{activeRank || '-'}</strong><small>Peringkat room</small></div></div><div className="feature-ranking">{rankedPlayers.map((player, index) => <div className="feature-rank-row" key={player.id || player.name}><span>{index + 1}</span><div className={`mini-avatar avatar-${player.color}`}>{player.avatar}</div><strong>{player.name}</strong><b>{player.score} pts</b></div>)}</div></>}
            {activeDialog === 'Misi' && <><div className="feature-hero mission-hero"><Gem /><div><strong>Target room</strong><small>Progres pemain yang sedang mendapat giliran.</small></div></div><h2 id="feature-title">Target Permainan</h2><div className="detail-mission"><div className="detail-mission-top"><Star /><strong>Jawab 5 soal benar</strong><b>{Math.min(correctAnswers, 5)}/5</b></div><div className="wide-progress"><span style={{ width: `${Math.min(correctAnswers / 5 * 100, 100)}%` }} /></div><small>Target latihan; tidak memberikan hadiah tambahan.</small></div><div className="detail-mission"><div className="detail-mission-top"><Medal /><strong>Streak 3 jawaban</strong><b>{Math.min(streak, 3)}/3</b></div><div className={`wide-progress ${streak >= 3 ? 'complete' : ''}`}><span style={{ width: `${Math.min(streak / 3 * 100, 100)}%` }} /></div><small>{streak >= 3 ? 'Target tercapai.' : 'Pertahankan jawaban benar secara beruntun.'}</small></div></>}
            {activeDialog === 'Belajar' && <><div className="feature-hero learn-hero"><BookOpen /><div><strong>Mini lesson KPK</strong><small>Materi referensi sebelum kembali bermain.</small></div></div><h2 id="feature-title">Pusat Belajar</h2><p className="feature-intro">KPK adalah kelipatan terkecil yang sama dari dua bilangan.</p><div className="lesson-card"><span>Contoh</span><strong>Kelipatan 3: 3, 6, 9, <em>12</em></strong><strong>Kelipatan 4: 4, 8, <em>12</em></strong><small>Jadi, KPK dari 3 dan 4 adalah 12.</small></div></>}
            {activeDialog === 'Profil' && <><div className="profile-hero"><div className="profile-big-avatar">{activePlayer?.avatar || 'P'}</div><div><h2 id="feature-title">{activePlayer?.name || 'Pemain'}</h2><p>Level {activePlayer?.level || 1} · Pemain aktif</p></div></div><div className="profile-xp"><div><span>XP saat ini</span><strong>{activePlayer?.totalXp || 0} XP</strong></div><div className="wide-progress"><span style={{ width: `${Math.min((activePlayer?.totalXp || 0) % 100, 100)}%` }} /></div></div><div className="profile-stats"><div><strong>{streak}</strong><small>Streak saat ini</small></div><div><strong>{activeAccuracy}%</strong><small>Akurasi</small></div><div><strong>{correctAnswers + wrongAnswers}</strong><small>Soal dijawab</small></div></div></>}
            {activeDialog === 'Cara bermain' && <><div className="feature-hero how-hero"><CircleHelp /><div><strong>Game lokal satu perangkat</strong><small>Pemain bergantian menggunakan perangkat yang sama.</small></div></div><h2 id="feature-title">Cara Bermain</h2><div className="how-steps"><div><b>01</b><span><strong>Lempar dadu</strong><small>Tekan tombol dadu pada giliranmu.</small></span></div><div><b>02</b><span><strong>Gerakkan pion</strong><small>Pilih pion yang dapat bergerak, lalu jawab soal KPK.</small></span></div><div><b>03</b><span><strong>Capai garis akhir</strong><small>Bawa empat pion ke pusat atau kumpulkan skor tertinggi sampai waktu habis.</small></span></div></div></>}
            {activeDialog === 'Notifikasi' && <><div className="feature-hero notification-hero"><Bell /><div><strong>Status permainan</strong><small>Informasi terbaru dari room aktif.</small></div></div><h2 id="feature-title">Notifikasi</h2><div className="notification-item"><Sparkles /><div><strong>Giliran {activePlayer?.name || 'pemain'}</strong><small>{notice}</small></div><span>Sekarang</span></div><div className="notification-item"><Trophy /><div><strong>Room {roomCode}</strong><small>{gamePlayers.length} pemain · giliran {turnNumber} · sisa {timeLeft}</small></div><span>Aktif</span></div></>}
            {activeDialog === 'Pengaturan' && <><div className="feature-hero settings-hero"><Settings /><div><strong>Pengaturan game</strong><small>Preferensi berlaku selama halaman ini terbuka.</small></div></div><h2 id="feature-title">Pengaturan</h2><div className="settings-list"><button onClick={() => setMuted((value) => !value)}><span><Volume2 /><strong>Suara umpan balik</strong></span><b>{muted ? 'Mati' : 'Nyala'}</b></button></div></>}
            <button className="roll-button dialog-action" onClick={closeDialog}>Kembali ke game</button>
          </div>
        </div>
      )}
      <QuestionModal
        open={questionOpen}
        dice={dice}
        selectedAnswer={selectedAnswer}
        feedback={feedback}
        correctOption={correctOption}
        isCorrect={isAnswerCorrect}
        explanation={explanation}
        question={currentQuestion}
        questionTimeSeconds={questionTimeSeconds}
        onClose={() => setQuestionOpen(false)}
        onLeave={leaveGame}
        onAnswer={answerQuestion}
        onContinue={continueAfterAnswer}
      />
      <div className="move-counter"><span>Giliran</span><strong>{turnNumber}</strong></div>
    </main>
  )
}
