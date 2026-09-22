import { Gem, Medal, Star } from 'lucide-react'

type MissionCardProps = { correctAnswers: number; streak?: number }

export function MissionCard({ correctAnswers, streak = 3 }: MissionCardProps) {
  const progress = Math.min((correctAnswers / 5) * 100, 100)
  return <section className="panel-card mission-card" aria-labelledby="mission-title"><div className="card-heading"><div><p className="eyebrow">HARI INI</p><h2 id="mission-title">Misi & hadiah</h2></div><Gem className="heading-icon gold" /></div><div className="mission-item"><div className="mission-icon purple"><Star /></div><div className="mission-copy"><strong>Jawab 5 soal benar</strong><div className="mission-progress"><span style={{ width: `${progress}%` }} /></div><small>{Math.min(correctAnswers, 5)} / 5 selesai</small></div><span className="reward">+20 XP</span></div><div className="mission-item"><div className="mission-icon orange"><Medal /></div><div className="mission-copy"><strong>Streak {streak} jawaban</strong><div className="mission-progress"><span style={{ width: '100%' }} /></div><small>Selesai!</small></div><span className="reward done">Selesai</span></div></section>
}
