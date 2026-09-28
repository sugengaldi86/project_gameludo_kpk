'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Clock3, Gamepad2, GraduationCap, ListChecks } from 'lucide-react'

type Content = { id: string; title: string; body: string }

export function WelcomeScreen({ onPlay }: { onPlay: () => void }) {
  const [objectives, setObjectives] = useState<Content[]>([])

  useEffect(() => {
    fetch('/api/learning-content', { cache: 'no-store' })
      .then(response => response.json())
      .then(result => setObjectives(result.data?.objectives || []))
      .catch(() => undefined)
  }, [])

  return <main className="welcome-page"><section className="welcome-card"><header className="welcome-header"><div className="welcome-brand"><span className="welcome-brand-mark" aria-hidden="true"><i/><i/><i/><i/></span><div><strong>Ludo KPK</strong><small>Matematika · Kelas V</small></div></div><span className="welcome-session"><Clock3/>30–40 menit</span></header><div className="welcome-layout"><div className="welcome-copy"><p className="welcome-kicker">BELAJAR SAMBIL BERMAIN</p><h1>KPK jadi lebih mudah dipahami.</h1><p className="welcome-lead">Pelajari caranya, susun langkah penyelesaian, lalu uji pemahamanmu lewat permainan Ludo.</p><div className="objective-box"><GraduationCap/><div><strong>{objectives[0]?.title || 'Tujuan Pembelajaran'}</strong><p>{objectives[0]?.body || 'Memahami dan menentukan KPK melalui pemecahan masalah.'}</p></div></div></div><aside className="welcome-menu"><span className="welcome-menu-label">Pilih kegiatan</span><Link href="/tujuan-pembelajaran"><span><ListChecks/><i><b>Tujuan pembelajaran</b><small>Kenali empat tahap pemecahan masalah</small></i></span><ArrowRight/></Link><Link className="welcome-material" href="/materi"><span><BookOpen/><i><b>Pelajari materi</b><small>Buka halaman materi KPK</small></i></span><ArrowRight/></Link><button className="welcome-play" onClick={onPlay}><span><Gamepad2/><i><b>Mulai bermain</b><small>Isi data pemain dan masuk ke papan</small></i></span><ArrowRight/></button><p><Clock3/>Timer dimulai setelah materi prapermainan selesai dibaca.</p></aside></div><footer className="welcome-footer"><span>Uraian bertahap</span><i/><span>Pilihan ganda</span><i/><span>1 pion per pemain</span></footer></section></main>
}
