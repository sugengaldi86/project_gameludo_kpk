import { BookOpen, ChevronRight } from 'lucide-react'

type LearningCardProps = { title?: string; description?: string; progress?: number; onOpen?: () => void }

export function LearningCard({ title = 'Belajar KPK', description = 'Pahami kelipatan terkecil yang sama melalui contoh singkat.', progress = 80, onOpen }: LearningCardProps) {
  return <section className="learning-card panel-card" aria-labelledby="learning-title"><div className="learning-icon"><BookOpen /></div><div className="learning-copy"><p className="eyebrow">RUANG BELAJAR</p><h2 id="learning-title">{title}</h2><p>{description}</p><div className="wide-progress"><span style={{ width: `${Math.min(progress, 100)}%` }} /></div></div>{onOpen && <button className="icon-button" onClick={onOpen} aria-label="Buka materi belajar"><ChevronRight /></button>}</section>
}
