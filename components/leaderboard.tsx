import { Trophy, ChevronRight } from 'lucide-react'
import type { Player } from '@/lib/game-data'

type LeaderboardProps = { players: Player[]; onOpen?: () => void }

export function Leaderboard({ players, onOpen }: LeaderboardProps) {
  return <section className="panel-card leaderboard-card" aria-labelledby="leaderboard-title"><div className="card-heading"><div><p className="eyebrow">PERINGKAT ROOM</p><h2 id="leaderboard-title">Leaderboard</h2></div><Trophy className="heading-icon" /></div><div className="leaderboard-list">{players.map((player, index) => <div className="leader-row" key={player.name}><span className={`rank rank-${index + 1}`}>{index + 1}</span><div className={`mini-avatar avatar-${player.color}`}>{player.avatar}</div><strong>{player.name}</strong><span className="leader-score">{player.score}<small> pts</small></span></div>)}</div>{onOpen && <button className="text-button" onClick={onOpen}>Lihat semua peringkat <ChevronRight /></button>}</section>
}
