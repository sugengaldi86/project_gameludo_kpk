'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react'
import { Dices, X, CheckCircle2, XCircle, ChevronRight, LogOut } from 'lucide-react'
import { Question } from '@/lib/game-data'
import { type SolutionItem } from '@/components/essay-question-modal'

const MCQ_METHOD_LABELS: Record<string, string> = {
  multiples: 'Mendaftar kelipatan',
  prime_factorization: 'Faktorisasi prima',
  repeated_division: 'Pembagian berulang / sengkedan',
}
const MCQ_METHOD_ORDER = ['multiples', 'prime_factorization', 'repeated_division']

type QuestionModalProps = {
  open: boolean
  dice: number
  selectedAnswer: string | null
  feedback: string
  correctOption?: string | null
  isCorrect?: boolean | null
  explanation?: { knownInformation?: string; askedInformation?: string; strategy?: string; solution?: string; solutionImageUrl?: string; solutions?: SolutionItem[] | null; finalExplanation?: string } | null
  question: Question | null
  questionTimeSeconds?: number | null
  onClose: () => void
  onLeave?: () => void
  onAnswer: (answer: string | null) => void | Promise<void>
  onContinue: () => void
}

export function QuestionModal({
  open,
  dice,
  selectedAnswer,
  feedback,
  correctOption,
  isCorrect,
  explanation,
  question,
  questionTimeSeconds,
  onClose,
  onLeave,
  onAnswer,
  onContinue,
}: QuestionModalProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  // Guard agar auto-submit timeout hanya dikirim SATU KALI
  const hasAutoSubmitted = useRef(false)

  // Timer initialization — reset guard setiap soal baru
  useEffect(() => {
    if (open && questionTimeSeconds && !feedback) {
      setTimeLeft(questionTimeSeconds)
      hasAutoSubmitted.current = false
    } else if (feedback || !open) {
      setTimeLeft(null)
    }
  }, [open, questionTimeSeconds, feedback])

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || feedback) return
    const timer = setTimeout(() => setTimeLeft((prev: number | null) => (prev !== null ? prev - 1 : null)), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, feedback])

  // Auto-submit on timeout — hanya satu kali
  useEffect(() => {
    if (timeLeft === 0 && !feedback && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true
      onAnswer(null)
    }
  }, [timeLeft, feedback, onAnswer])

  if (!open || !question || question.type === 'essay') return null

  const hasAnswered = Boolean(feedback)
  const correct = typeof isCorrect === 'boolean' ? isCorrect : selectedAnswer === correctOption
  const timerPercent = questionTimeSeconds && timeLeft !== null ? (timeLeft / questionTimeSeconds) * 100 : 0
  const isUrgent = timeLeft !== null && timeLeft <= 10

  function renderStage3() {
    if (!explanation) return null
    const hasSolutions = Array.isArray(explanation.solutions) && explanation.solutions.some(s => (s.steps?.length ?? 0) > 0)
    const hasLegacy = !hasSolutions && Boolean(explanation.solution)
    if (!hasSolutions && !hasLegacy && !explanation.solutionImageUrl) return null
    return (
      <section className="answer-explanation-stage">
        {hasSolutions && (
          <div className="essay-method-cards">
            {MCQ_METHOD_ORDER.map(method => {
              const item = explanation.solutions!.find(s => s.method === method)
              if (!item || !item.steps?.length) return null
              return (
                <div key={method} className="essay-method-card">
                  <strong className="essay-method-card-title">{MCQ_METHOD_LABELS[method]}</strong>
                  {item.steps.map((step, i) => <p key={i}>{step}</p>)}
                </div>
              )
            })}
          </div>
        )}
        {hasLegacy && <p>{explanation.solution}</p>}
        {explanation.solutionImageUrl && <img className="answer-explanation-image" src={explanation.solutionImageUrl} alt="Ilustrasi pembahasan" />}
      </section>
    )
  }

  return (
    <div className="question-overlay" role="dialog" aria-modal="true" aria-labelledby="question-modal-title">
      <div className="question-modal" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
        {questionTimeSeconds && !hasAnswered && timeLeft !== null && (
          <div className="question-timer-bar">
            <div className={`question-timer-fill ${isUrgent ? 'urgent' : ''}`} style={{ width: `${timerPercent}%` }} />
            <span className={isUrgent ? 'urgent-text' : ''}>{timeLeft}s</span>
          </div>
        )}
        <div className="question-topline">
          <span className="eyebrow">SOAL KPK · 10 POIN</span>
          <div className="question-modal-actions">
            {onLeave && <button className="leave-question" onClick={onLeave} aria-label="Akhiri game"><LogOut /></button>}
            <button className="close-question" onClick={onClose} aria-label="Tutup soal" disabled={!hasAnswered}><X /></button>
          </div>
        </div>
        <div className="question-icon"><Dices /></div>
        <h2 id="question-modal-title">{question.content || question.text}</h2>
        <p>Pilih jawaban yang benar untuk menggerakkan pion sejauh {dice} langkah.</p>

        <div className="answer-grid">
          {(Array.isArray(question.options)
            ? question.options.map((opt) => {
                if (typeof opt === 'object' && 'key' in opt) return { key: String(opt.key), text: String(opt.text) }
                // JSONB format dari SQL: { A: 'teks A', B: 'teks B', ... }
                const entries = Object.entries(opt as Record<string, string>)
                return entries.map(([k, v]) => ({ key: k, text: v }))
              }).flat()
            : []
          ).map((answer) => {
            const isSelected = selectedAnswer === answer.key
            const answerState = hasAnswered
              ? answer.key === correctOption
                ? 'is-correct'
                : isSelected
                  ? 'is-wrong'
                  : ''
              : isSelected
                ? 'selected'
                : ''

            return (
              <button
                key={answer.key}
                className={`answer-button ${answerState}`}
                onClick={() => {
                  // Cegah klik ganda: jika sudah ada jawaban, abaikan
                  if (hasAnswered || selectedAnswer) return
                  onAnswer(answer.key)
                }}
                disabled={hasAnswered || Boolean(selectedAnswer)}
              >
                <strong>{answer.key}.</strong> {answer.text}
              </button>
            )
          })}
        </div>

        {hasAnswered && (
          <div className={`answer-review ${correct ? 'correct' : 'wrong'}`} role="status" aria-live="polite">
            <strong>
              {correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {correct ? 'Jawaban benar!' : 'Jawaban belum tepat'}
            </strong>
            {feedback && <p>{feedback}</p>}
            {explanation && (
              <div className="answer-explanation">
                <span>Pembahasan</span>
                {explanation.knownInformation && <p><b>Diketahui:</b> {explanation.knownInformation}</p>}
                {explanation.askedInformation && <p><b>Ditanyakan:</b> {explanation.askedInformation}</p>}
                {explanation.strategy && <p><b>Strategi:</b> {explanation.strategy}</p>}
                {renderStage3()}
                {explanation.finalExplanation && <p style={{ marginTop: '0.5rem' }}><b>✅ Jawaban akhir:</b> {explanation.finalExplanation}</p>}
              </div>
            )}
            <button className="continue-answer" onClick={onContinue}>
              {correct ? '🎯 Tutup & Pilih Pion' : '➡️ Giliran Berikutnya'} <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="question-progress"><span /><small>{question.code || 'Soal KPK'}</small></div>
      </div>
    </div>
  )
}
