import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ObjectivesPage() {
  const { data, error } = await supabaseServer()
    .from("learning_contents")
    .select("id,title,body,display_order")
    .eq("content_type", "objective")
    .eq("is_active", true)
    .order("display_order");

  const objectives = data || [];

  return (
    <main className="objective-page">
      <header className="lesson-topbar">
        <Link href="/" className="lesson-brand">
          <span>
            <ListChecks />
          </span>
          <div>
            <strong>Ludo KPK</strong>
            <small>Tujuan Pembelajaran</small>
          </div>
        </Link>
        <Link href="/" className="lesson-back">
          <ArrowLeft />
          Kembali ke halaman utama
        </Link>
      </header>

      <section className="objective-shell">
        <div className="objective-heading">
          <p>TUJUAN PEMBELAJARAN</p>
          <h1>
            Tujuan Pembelajaran Ludo Kelipatan Persekutuan Terkecil (KPK).
          </h1>
          <span>
            Setelah mengikuti pembelajaran dan permainan, murid diharapkan
            mencapai empat tujuan berikut.
          </span>
        </div>

        {error ? (
          <div className="lesson-empty">
            <ListChecks />
            <h2>Tujuan pembelajaran gagal dimuat</h2>
            <p>{error.message}</p>
          </div>
        ) : objectives.length === 0 ? (
          <div className="lesson-empty">
            <ListChecks />
            <h2>Tujuan pembelajaran belum tersedia</h2>
            <p>Admin belum mempublikasikan tujuan pembelajaran.</p>
          </div>
        ) : (
          <div className="objective-steps">
            {objectives.map((item, index) => (
              <article key={item.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <CheckCircle2 />
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="objective-actions">
          <Link href="/materi">
            <BookOpen />
            Pelajari materi
            <ArrowRight />
          </Link>
          <Link href="/">Kembali ke halaman utama</Link>
        </footer>
      </section>
    </main>
  );
}
