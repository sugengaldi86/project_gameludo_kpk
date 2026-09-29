"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LogOut } from "lucide-react";
import type { Question } from "@/lib/game-data";

export type SolutionMethod =
  | "multiples"
  | "prime_factorization"
  | "repeated_division";
export type EssayAnswer = {
  known: string;
  asked: string;
  method: SolutionMethod;
  plan: string;
  solution: string;
  check: string;
};
const EMPTY_ANSWER: EssayAnswer = {
  known: "",
  asked: "",
  method: "multiples",
  plan: "",
  solution: "",
  check: "",
};
const METHODS: Array<{ value: SolutionMethod; label: string }> = [
  { value: "multiples", label: "Mendaftar kelipatan" },
  { value: "prime_factorization", label: "Faktorisasi prima" },
  { value: "repeated_division", label: "Pembagian berulang / sengkedan" },
];

type Explanation = {
  knownInformation?: string | null;
  askedInformation?: string | null;
  strategy?: string | null;
  finalExplanation?: string | null;
  solutions?: Array<{ method: string; steps: string[] }>;
};

export function EssayQuestionModal({
  open,
  question,
  progress,
  saving,
  explanation,
  onSubmit,
  onLeave,
  onContinue,
}: {
  open: boolean;
  question: Question | null;
  progress: string;
  saving: boolean;
  explanation?: Explanation | null;
  onSubmit: (answer: EssayAnswer) => Promise<void>;
  onLeave: () => void;
  onContinue?: () => void;
}) {
  const [answer, setAnswer] = useState<EssayAnswer>(EMPTY_ANSWER);
  if (!open || !question || question.type !== "essay") return null;
  const change = <K extends keyof EssayAnswer>(key: K, value: EssayAnswer[K]) =>
    setAnswer((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(answer);
    setAnswer(EMPTY_ANSWER);
  }

  return (
    <div
      className="question-overlay essay-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="essay-title"
    >
      {!explanation ? (
        <form className="question-modal essay-modal" onSubmit={submit}>
          <div className="question-topline">
            <span className="essay-progress">
              Uraian <b>{progress}</b>
            </span>
            <button
              type="button"
              className="leave-question"
              onClick={onLeave}
              aria-label="Akhiri game"
            >
              <LogOut />
            </button>
          </div>
          <div className="essay-question-copy">
            <span>{question.code || "SOAL KPK"}</span>
            <h2 id="essay-title">{question.content || question.text}</h2>
            <p>Lengkapi empat tahap pemecahan masalah berikut.</p>
          </div>
          <div className="essay-answer-grid">
            <fieldset className="essay-stage understand">
              <legend>
                <b>01</b> Memahami masalah
              </legend>
              <div className="essay-understand-grid">
                <label>
                  <span>Diketahui</span>
                  <textarea
                    required
                    rows={3}
                    value={answer.known}
                    onChange={(event) => change("known", event.target.value)}
                    placeholder="Informasi apa yang tersedia pada soal?"
                  />
                </label>
                <label>
                  <span>Ditanyakan</span>
                  <textarea
                    required
                    rows={3}
                    value={answer.asked}
                    onChange={(event) => change("asked", event.target.value)}
                    placeholder="Apa yang harus kamu cari?"
                  />
                </label>
              </div>
            </fieldset>
            <fieldset className="essay-stage plan">
              <legend>
                <b>02</b> Merencanakan penyelesaian
              </legend>
              <div
                className="essay-methods"
                role="radiogroup"
                aria-label="Pilih cara penyelesaian"
              >
                <span className="essay-methods-label">Pilih cara:</span>
                {METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={answer.method === method.value ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="solution-method"
                      value={method.value}
                      checked={answer.method === method.value}
                      onChange={() => change("method", method.value)}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
              <label>
                <span>Rencana atau strategi</span>
                <textarea
                  required
                  rows={3}
                  value={answer.plan}
                  onChange={(event) => change("plan", event.target.value)}
                  placeholder="Tuliskan langkah yang akan digunakan."
                />
              </label>
            </fieldset>
            <fieldset className="essay-stage execute">
              <legend>
                <b>03</b> Melaksanakan rencana
              </legend>
              <label>
                <span>Proses perhitungan dan jawaban</span>
                <textarea
                  required
                  rows={4}
                  value={answer.solution}
                  onChange={(event) => change("solution", event.target.value)}
                  placeholder="Tuliskan proses perhitungan dan jawabannya."
                />
              </label>
            </fieldset>
            <fieldset className="essay-stage check">
              <legend>
                <b>04</b> Memeriksa kembali
              </legend>
              <label>
                <span>Bukti atau pemeriksaan jawaban</span>
                <textarea
                  required
                  rows={3}
                  value={answer.check}
                  onChange={(event) => change("check", event.target.value)}
                  placeholder="Tuliskan bukti bahwa jawabanmu benar."
                />
              </label>
            </fieldset>
          </div>
          <div className="essay-submit-row">
            <small>Jawaban uraian akan diperiksa oleh guru.</small>
            <button className="continue-answer" disabled={saving}>
              {saving ? "Menyimpan…" : "Selesai dan Lihat Feedback"}
            </button>
          </div>
        </form>
      ) : (
        <div className="question-modal essay-modal essay-feedback">
          <div className="question-topline">
            <span className="essay-progress">
              Uraian <b>{progress}</b>
            </span>
            <button
              type="button"
              className="leave-question"
              onClick={onLeave}
              aria-label="Akhiri game"
            >
              <LogOut />
            </button>
          </div>
          <div className="essay-feedback-heading">
            <CheckCircle2 />
            <div>
              <h2 id="essay-title">Jawaban berhasil disimpan</h2>
              <p>
                Jawabanmu akan diperiksa oleh guru. Pembahasan ini merupakan
                referensi, bukan nilai akhir.
              </p>
            </div>
          </div>
          <div className="essay-reference">
            <span className="essay-reference-label">PEMBAHASAN REFERENSI</span>
            {explanation.knownInformation && (
              <section>
                <b>01 · Memahami masalah</b>
                <p>
                  <strong>Diketahui</strong>
                  {explanation.knownInformation}
                </p>
                {explanation.askedInformation && (
                  <p>
                    <strong>Ditanyakan</strong>
                    {explanation.askedInformation}
                  </p>
                )}
              </section>
            )}
            {explanation.strategy && (
              <section>
                <b>02 · Merencanakan penyelesaian</b>
                <p>{explanation.strategy}</p>
              </section>
            )}
            {explanation.solutions?.map((solution) => (
              <section key={solution.method}>
                <b>
                  03 ·{" "}
                  {METHODS.find((method) => method.value === solution.method)
                    ?.label || "Melaksanakan rencana"}
                </b>
                {solution.steps.map((step, index) => (
                  <p key={index}>{step}</p>
                ))}
              </section>
            ))}
            {explanation.finalExplanation && (
              <section>
                <b>04 · Memeriksa kembali</b>
                <p>{explanation.finalExplanation}</p>
              </section>
            )}
          </div>
          <div className="essay-submit-row">
            <small>Nilai uraian belum dihitung pada peringkat sementara.</small>
            <button className="continue-answer" onClick={onContinue}>
              Lanjutkan Permainan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
