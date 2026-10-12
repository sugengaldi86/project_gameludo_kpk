/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LogOut } from "lucide-react";
import type { Question } from "@/lib/game-data";

export type SolutionMethod =
  | "multiples"
  | "prime_factorization"
  | "repeated_division";

export type SolutionItem = {
  method: SolutionMethod;
  steps: string[];
  result?: number;
};

const METHOD_LABELS: Record<SolutionMethod, string> = {
  multiples: "Mendaftar kelipatan",
  prime_factorization: "Faktorisasi prima",
  repeated_division: "Pembagian berulang / sengkedan",
};
const METHOD_ORDER: SolutionMethod[] = [
  "multiples",
  "prime_factorization",
  "repeated_division",
];

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
  knownInformationImageUrl?: string | null;
  askedInformation?: string | null;
  askedInformationImageUrl?: string | null;
  strategy?: string | null;
  strategyImageUrl?: string | null;
  solution?: string | null;
  solutionImageUrl?: string | null;
  solutions?: SolutionItem[] | null;
  finalExplanation?: string | null;
  finalExplanationImageUrl?: string | null;
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

  function renderStage3(expl: Explanation) {
    const hasSolutions =
      Array.isArray(expl.solutions) &&
      expl.solutions.some((s) => (s.steps?.length ?? 0) > 0);
    const hasLegacySolution = !hasSolutions && Boolean(expl.solution);
    const hasStage3 =
      hasSolutions || hasLegacySolution || Boolean(expl.solutionImageUrl);
    if (!hasStage3) return null;
    return (
      <section>
        <b>Tahap 3 &middot; Pelaksanaan Rencana</b>
        {hasSolutions && (
          <div className="essay-method-cards">
            {METHOD_ORDER.map((method) => {
              const item = expl.solutions!.find((s) => s.method === method);
              if (!item || !item.steps?.length) return null;
              return (
                <div key={method} className="essay-method-card">
                  <strong className="essay-method-card-title">
                    {METHOD_LABELS[method]}
                  </strong>
                  {item.steps.map((step, i) => (
                    <p key={i}>{step}</p>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {hasLegacySolution && <p>{expl.solution}</p>}
        {expl.solutionImageUrl && (
          <img
            className="essay-reference-image"
            src={expl.solutionImageUrl}
            alt="Ilustrasi pelaksanaan rencana"
          />
        )}
      </section>
    );
  }

  function hasAnyExplanation(expl: Explanation) {
    return Boolean(
      expl.knownInformation ||
        expl.knownInformationImageUrl ||
        expl.askedInformation ||
        expl.askedInformationImageUrl ||
        expl.strategy ||
        expl.strategyImageUrl ||
        expl.finalExplanation ||
        expl.finalExplanationImageUrl ||
        expl.solution ||
        expl.solutionImageUrl ||
        (Array.isArray(expl.solutions) &&
          expl.solutions.some((s) => (s.steps?.length ?? 0) > 0))
    );
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
              {saving ? "Menyimpan..." : "Selesai dan Lihat Feedback"}
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
              <h2 id="essay-title">Jawaban Berhasil Disimpan!</h2>
              <p>
                Jawabanmu akan divalidasi oleh guru. Mari lihat pembahasan atau
                kunci jawaban untuk soal ini.
              </p>
            </div>
          </div>
          <div className="essay-reference">
            <span className="essay-reference-label">PEMBAHASAN REFERENSI</span>
            {(explanation.knownInformation ||
              explanation.knownInformationImageUrl) && (
              <section>
                <b>Tahap 1 &middot; Diketahui</b>
                {explanation.knownInformation && (
                  <p>{explanation.knownInformation}</p>
                )}
                {explanation.knownInformationImageUrl && (
                  <img
                    className="essay-reference-image"
                    src={explanation.knownInformationImageUrl}
                    alt="Ilustrasi informasi yang diketahui"
                  />
                )}
              </section>
            )}
            {(explanation.askedInformation ||
              explanation.askedInformationImageUrl) && (
              <section>
                <b>Tahap 1 &middot; Ditanyakan</b>
                {explanation.askedInformation && (
                  <p>{explanation.askedInformation}</p>
                )}
                {explanation.askedInformationImageUrl && (
                  <img
                    className="essay-reference-image"
                    src={explanation.askedInformationImageUrl}
                    alt="Ilustrasi informasi yang ditanyakan"
                  />
                )}
              </section>
            )}
            {(explanation.strategy || explanation.strategyImageUrl) && (
              <section>
                <b>Tahap 2 &middot; Rencana Pemecahan</b>
                {explanation.strategy && <p>{explanation.strategy}</p>}
                {explanation.strategyImageUrl && (
                  <img
                    className="essay-reference-image"
                    src={explanation.strategyImageUrl}
                    alt="Ilustrasi rencana pemecahan"
                  />
                )}
              </section>
            )}
            {renderStage3(explanation)}
            {(explanation.finalExplanation ||
              explanation.finalExplanationImageUrl) && (
              <section>
                <b>Tahap 4 &middot; Pemeriksaan Kembali</b>
                <p>
                  <strong className="essay-final-answer">
                    &#x2705; Jawaban akhir:{" "}
                  </strong>
                  {explanation.finalExplanation}
                </p>
                {explanation.finalExplanationImageUrl && (
                  <img
                    className="essay-reference-image"
                    src={explanation.finalExplanationImageUrl}
                    alt="Ilustrasi pemeriksaan kembali"
                  />
                )}
              </section>
            )}
            {!hasAnyExplanation(explanation) && (
              <section>
                <p>Pembahasan belum tersedia untuk soal ini.</p>
              </section>
            )}
          </div>
          <div className="essay-submit-row">
            <small>Nilai uraian belum dihitung pada peringkat sementara.</small>
            <button className="continue-answer" onClick={onContinue}>
              Lanjutkan Permainan &#127919;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
