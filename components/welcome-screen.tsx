"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Gamepad2,
  ListChecks,
} from "lucide-react";

export function WelcomeScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <header className="welcome-header">
          <div className="welcome-brand">
            <span className="welcome-brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <div>
              <strong>Ludo KPK</strong>
              <small>Matematika · Kelas V</small>
            </div>
          </div>
          <span className="welcome-session">
            <Clock3 />
            30–40 menit
          </span>
        </header>
        <div className="welcome-layout">
          <div className="welcome-copy">
            <p className="welcome-kicker">BELAJAR SAMBIL BERMAIN</p>
            <h1>
              Kelipatan Persekutuan Terkecil (KPK) Menjadi Lebih Mudah Dipahami.
            </h1>
            <p className="welcome-lead">
              Pelajari caranya, susun langkah penyelesaian, kemudian uji
              pemahamanmu melalui permainan Ludo.
            </p>
          </div>
          <aside className="welcome-menu">
            <span className="welcome-menu-label">Pilih kegiatan</span>
            <Link href="/tujuan-pembelajaran">
              <span>
                <ListChecks />
                <i>
                  <b>Tujuan Pembelajaran</b>
                  <small>Pahami kemampuan yang akan kamu capai</small>
                </i>
              </span>
              <ArrowRight />
            </Link>
            <Link className="welcome-material" href="/materi">
              <span>
                <BookOpen />
                <i>
                  <b>Pelajari Materi</b>
                  <small>
                    Buka halaman materi Kelipatan Persekutuan Terkecil (KPK)
                  </small>
                </i>
              </span>
              <ArrowRight />
            </Link>
            <button className="welcome-play" onClick={onPlay}>
              <span>
                <Gamepad2 />
                <i>
                  <b>Mulai Bermain</b>
                  <small>Isi data pemain dan mulai bermain</small>
                </i>
              </span>
              <ArrowRight />
            </button>
            <p>
              <Clock3 />
              Waktu akan dimulai setelah materi selesai dibaca
            </p>
          </aside>
        </div>
        <footer className="welcome-footer">
          <span> Soal Uraian Bertahap</span>
          <i />
          <span> Soal Pilihan Ganda Bertahap</span>
          <i />
          <span>1 pion per pemain</span>
        </footer>
      </section>
    </main>
  );
}
