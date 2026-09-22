import {
  QUESTION_DIFFICULTIES,
  type OptionKey,
  type QuestionInput,
} from '@/lib/admin-types'

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D']

function gcd(first: number, second: number): number {
  let a = Math.abs(first)
  let b = Math.abs(second)
  while (b) [a, b] = [b, a % b]
  return a
}

function lcm(first: number, second: number): number {
  return Math.abs(first * second) / gcd(first, second)
}

export function calculateLcm(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((result, value) => lcm(result, value))
}

export function validateQuestionInput(value: unknown):
  | { success: true; data: QuestionInput }
  | { success: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { success: false, error: 'Data soal tidak valid' }
  }

  const input = value as Partial<QuestionInput>
  const numberA = Number(input.number_a)
  const numberB = Number(input.number_b)
  const numberC = input.number_c ? Number(input.number_c) : null
  const code = String(input.question_code || '').trim().toUpperCase()
  const story = String(input.story || '').trim()
  const knownInformation = String(input.known_information || '').trim()
  const askedInformation = String(input.asked_information || '').trim()
  const finalExplanation = String(input.final_explanation || '').trim()

  if (!/^Q[A-Z0-9-]{1,19}$/.test(code)) {
    return { success: false, error: 'Kode soal harus diawali Q, misalnya Q01' }
  }
  if (story.length < 20) {
    return { success: false, error: 'Cerita soal minimal 20 karakter' }
  }
  if (!knownInformation || !askedInformation) {
    return { success: false, error: 'Bagian diketahui dan ditanyakan wajib diisi' }
  }
  if (finalExplanation.length < 10) {
    return { success: false, error: 'Jawaban akhir dan cek ulang minimal 10 karakter' }
  }
  if (![numberA, numberB].every(Number.isInteger) || numberA < 1 || numberB < 1) {
    return { success: false, error: 'Bilangan A dan B harus berupa bilangan bulat positif' }
  }
  if (numberC !== null && (!Number.isInteger(numberC) || numberC < 1)) {
    return { success: false, error: 'Bilangan C harus berupa bilangan bulat positif' }
  }
  if (!QUESTION_DIFFICULTIES.includes(input.difficulty as never)) {
    return { success: false, error: 'Tingkat kesulitan tidak valid' }
  }

  const options = Array.isArray(input.question_options) ? input.question_options : []
  if (options.length !== 4) {
    return { success: false, error: 'Soal harus memiliki tepat empat pilihan jawaban' }
  }
  if (!OPTION_KEYS.every((key) => options.some((option) => option.option_key === key))) {
    return { success: false, error: 'Pilihan jawaban harus terdiri dari A, B, C, dan D' }
  }
  if (options.some((option) => !String(option.option_text || '').trim())) {
    return { success: false, error: 'Semua pilihan jawaban wajib diisi' }
  }

  const correctOptions = options.filter((option) => option.is_correct)
  if (correctOptions.length !== 1) {
    return { success: false, error: 'Tepat satu pilihan harus ditandai benar' }
  }

  const expectedLcm = calculateLcm(numberC ? [numberA, numberB, numberC] : [numberA, numberB])
  if (Number(input.correct_value) !== expectedLcm) {
    return { success: false, error: `Nilai jawaban benar harus sama dengan KPK, yaitu ${expectedLcm}` }
  }

  const correctOption = correctOptions[0].option_key as OptionKey
  if (input.correct_option !== correctOption) {
    return { success: false, error: 'Penanda pilihan benar tidak konsisten' }
  }
  const numericAnswer = Number(String(correctOptions[0].option_text).replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0])
  if (!Number.isFinite(numericAnswer) || numericAnswer !== expectedLcm) {
    return { success: false, error: `Teks pilihan yang ditandai benar harus memuat nilai KPK ${expectedLcm}` }
  }

  const solutions = Array.isArray(input.question_solutions) ? input.question_solutions : []
  const methods = new Set(solutions.map((solution) => solution.method))
  if (!methods.has('multiples') || !methods.has('prime_factorization')) {
    return { success: false, error: 'Langkah kelipatan dan faktorisasi prima wajib diisi' }
  }
  if (solutions.some((solution) => !Array.isArray(solution.steps) || !solution.steps.some((step) => String(step).trim()))) {
    return { success: false, error: 'Setiap metode pembahasan wajib memiliki minimal satu langkah' }
  }

  return {
    success: true,
    data: {
      question_code: code,
      story,
      difficulty: input.difficulty!,
      topic: String(input.topic || 'kpk').trim().toLowerCase(),
      known_information: knownInformation,
      asked_information: askedInformation,
      strategy: String(input.strategy || 'KPK').trim().toUpperCase(),
      number_a: numberA,
      number_b: numberB,
      number_c: numberC,
      correct_value: expectedLcm,
      correct_option: correctOption,
      final_explanation: finalExplanation,
      is_active: Boolean(input.is_active),
      question_options: options.map((option) => ({
        option_key: option.option_key,
        option_text: String(option.option_text).trim(),
        is_correct: option.option_key === correctOption,
      })),
      question_solutions: solutions.map((solution) => ({
        method: solution.method,
        steps: Array.isArray(solution.steps)
          ? solution.steps.map(String).map((step) => step.trim()).filter(Boolean)
          : [],
        result: expectedLcm,
      })),
    },
  }
}
