import { Award, Flame, Gamepad2, Trophy } from 'lucide-react'

type ProfilePanelProps = { name?: string; level?: number; xp?: number; games?: number; wins?: number }

export function ProfilePanel({ name = 'Aldi', level = 8, xp = 720, games = 24, wins = 16 }: ProfilePanelProps) {
  return <section className="profile-panel panel-card" aria-labelledby="profile-title"><div className="profile-hero"><div className="profile-large-avatar">{name.charAt(0)}</div><div><p className="eyebrow">PROFIL PEMAIN</p><h2 id="profile-title">{name}</h2><span>Level {level} · {xp} XP</span></div></div><div className="profile-stats"><div><Gamepad2 /><strong>{games}</strong><small>Permainan</small></div><div><Trophy /><strong>{wins}</strong><small>Kemenangan</small></div><div><Flame /><strong>7</strong><small>Streak hari</small></div><div><Award /><strong>12</strong><small>Lencana</small></div></div></section>
}
