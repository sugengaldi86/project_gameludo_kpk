export const QUESTION_DIFFICULTIES = [
  'mudah',
  'sedang',
  'kontekstual',
  'tiga_bilangan',
] as const

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number]
export type OptionKey = 'A' | 'B' | 'C' | 'D'

export type QuestionOption = {
  id?: string
  option_key: OptionKey
  option_text: string
  is_correct: boolean
}

export type QuestionSolution = {
  id?: string
  method: 'multiples' | 'prime_factorization'
  steps: string[]
  result: number
}

export type AdminQuestion = {
  id: string
  question_code: string
  story: string
  difficulty: QuestionDifficulty
  topic: string
  known_information: string
  asked_information: string
  strategy: string
  number_a: number
  number_b: number
  number_c: number | null
  correct_value: number
  correct_option: OptionKey
  final_explanation: string
  is_active: boolean
  created_at: string
  question_options: QuestionOption[]
  question_solutions: QuestionSolution[]
}

export type QuestionInput = Omit<AdminQuestion, 'id' | 'created_at'>

export type StudentReport = {
  playerId: string
  name: string
  sessionCount: number
  questionCount: number
  correctCount: number
  incorrectCount: number
  accuracy: number
  pretestScore: number
  informationAccuracy: number
  strategyAccuracy: number
  kpkAccuracy: number
  verificationAccuracy: number
  latestActivity: string | null
}

export type RoomFilter = {
  id: string
  room_code: string
}

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'finished' | 'cancelled'
export type AdminExam = {
  id: string
  name: string
  learning_goal: string | null
  starts_at: string
  ends_at: string
  duration_minutes: number
  question_time_seconds: number | null
  question_count: number | null
  difficulty: string | null
  randomize_questions: boolean
  randomize_options: boolean
  late_tolerance_minutes: number
  auto_submit: boolean
  allow_resume: boolean
  allow_rejoin: boolean
  max_attempts: number
  status: ExamStatus
  created_at: string
}
