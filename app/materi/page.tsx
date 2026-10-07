/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Gamepad2, GraduationCap } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type LearningContent = { id: string; content_type: 'objective' | 'material'; title: string; body: string; image_url: string | null; display_order: number }

export default async function MaterialPage() {
  const { data, error } = await supabaseServer().from('learning_contents').select('id,content_type,title,body,image_url,display_order').eq('is_active', true).order('display_order')
  const contents = (data || []) as LearningContent[]
  const objectives = contents.filter(item => item.content_type === 'objective')
  const materials = contents.filter(item => item.content_type === 'material')

  return <main className="lesson-page"><header className="lesson-topbar"><Link href="/" className="lesson-brand"><span><BookOpen/></span><div><strong>Ludo KPK</strong><small>Materi Pembelajaran</small></div></Link><Link href="/" className="lesson-back"><ArrowLeft/>Kembali ke halaman utama</Link></header><div className="lesson-shell"><aside className="lesson-sidebar"><span className="lesson-label">DAFTAR MATERI</span><nav>{materials.map((item,index)=><a key={item.id} href={`#materi-${item.id}`}><b>{String(index+1).padStart(2,'0')}</b><span>{item.title}</span></a>)}</nav>{objectives[0]&&<div className="lesson-side-note"><GraduationCap/><span><strong>{objectives[0].title}</strong><small>{objectives[0].body}</small></span></div>}</aside><article className="lesson-content"><div className="lesson-heading"><p>MATERI MATEMATIKA KELAS V</p><h1>Kelipatan Persekutuan Terkecil (KPK)</h1><span>Pelajari setiap bagian secara berurutan sebelum memulai permainan.</span></div>{error?<section className="lesson-empty"><BookOpen/><h2>Materi gagal dimuat</h2><p>{error.message}</p></section>:materials.length === 0 ? <section className="lesson-empty"><BookOpen/><h2>Materi belum tersedia</h2><p>Admin belum mempublikasikan materi pembelajaran.</p></section> : <div className="lesson-sections">{materials.map((item,index)=><section id={`materi-${item.id}`} key={item.id}><div className="lesson-number">{String(index+1).padStart(2,'0')}</div><div><span className="lesson-section-kicker">BAGIAN {index+1}</span><h2>{item.title}</h2>{item.image_url && <img src={item.image_url} alt={`Ilustrasi ${item.title}`}/>}<div className="lesson-body">{item.body}</div></div></section>)}</div>}<footer className="lesson-cta"><div><strong>Sudah memahami materinya?</strong><p>Lanjutkan dengan mengisi data pemain untuk memulai permainan.</p></div><Link href="/bermain"><Gamepad2/>Mulai bermain<ArrowRight/></Link></footer></article></div></main>
}
